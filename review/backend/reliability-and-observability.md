# Reliability, logging and monitoring

Owner: Manveer. Reviewed on 10 November 2026 at commit `196f4f9`.

Files read: `backend/src/server.ts`, `app.ts`, `observability/*.ts`, `http/middleware/*.ts`, `services/health.service.ts`, `db/pool.ts`, `db/migrator.ts`, `integrations/paypal/client.ts`, and `deploy/compose.yml`. Production was checked with one GET each to `/api/health`, `/health/ready` and `/metrics` on `https://api.foldback.tech`.

## Verified as implemented

| Area | Evidence |
|---|---|
| Timeouts | Every PayPal call and token fetch has `AbortSignal.timeout(PAYPAL_TIMEOUT_MS)` (`client.ts:387`, `:418`). Postgres: 5 s statement and connect timeouts. LLM timeouts are Ravi's area. |
| No automatic retries of money calls | None in the code. A lost reply waits for sync (`architecture.md`, "Every recovery path reads from the database"). |
| Health and readiness | `/health/live` always 200. `/health/ready` is 200 only when `SELECT 1` works and every migration is applied with an unchanged checksum (`health.service.ts:12-19`). Production answered `{"status":"ok"}`. Compose and `smoke.sh` use both. |
| PayPal down | Abort, network error or 5xx → `unknown` → share reserved, plan paused, `200 outcome: unknown` or `409 money_unknown`. No token → `pauseUnsent` (share held again, `502 paypal_failed`, safe retry). `resolve.test.ts` "when PayPal cannot be reached". |
| Structured logs | winston JSON in production, a request id per request (accepted from the proxy only if it matches `^[A-Za-z0-9._-]{8,64}$`, echoed as `X-Request-Id`), user id added after the auth guard. Redaction of `authorization`, `cookie`, `set-cookie`, `password`, `access_token`, `client_secret`, `x-api-key` at any depth (`logger.ts:4-30`). The query string is never logged. PayPal call logs carry path, status, debug id, outcome and duration, never bodies. `logger.test.ts` covers redaction. |
| Boot safety | `loadEnv` fails fast. `PAYPAL_ENV` must be the literal `sandbox` and the base URL the sandbox one (`env.ts:55-62`). The server refuses to start when migrations are not current (`server.ts:20-24`). |
| Graceful shutdown | SIGTERM and SIGINT close Socket.IO and the HTTP server, then the pool, with a 10 s cap (`server.ts:37-53`). |

## [BE-008] There are no metrics or traces, although the spec, the quality gates and the runbook rely on them

- Category: Observability
- Severity: Medium
- Status: Missing
- File: `backend/package.json`, `docs/spec/architecture.md`, `docs/spec/quality.md`, `docs/spec/deploy.md`
- Code Location: no `/metrics` route and no `prom-client` or `@opentelemetry/*` dependency; `architecture.md:19`, `:49`, `:284`, `:286`; `quality.md:107`; `deploy.md:210`
- Description: The spec lists `/metrics` (prom-client) with `http_request_duration_seconds`, `paypal_calls_total`, `resolve_outcomes_total` and others, optional OpenTelemetry, and a p95 latency budget measured from that histogram. `architecture.md:49` itself notes `/metrics` "is not built yet".
- Current Implementation: Production `GET https://api.foldback.tech/metrics` answers `404 not_found`. `METRICS_TOKEN` and `OTEL_EXPORTER_OTLP_ENDPOINT` are parsed by `env.ts` but nothing reads them. The `deploy.md` operations command for metrics cannot work.
- Problem: `quality.md` §5's p95 budgets cannot be measured, and there is no signal for PayPal unknowns or AI fallbacks except reading logs on the Mac. On the positive side, nothing is exposed through the tunnel.
- Why It Matters: Two judges' lenses (engineering manager, software engineer) look for production readiness, and the spec claims it. Either build the small version or change the spec so it does not overclaim.
- Recommended Solution: Smallest useful version, with approved dependencies only: add `prom-client` (already on the approved list), register default metrics plus `http_request_duration_seconds{route,method,status}` in `requestLogger`, `paypal_calls_total{kind,outcome}` in `client.ts`'s `send`, and `resolve_outcomes_total` in `runResolve`. Serve `/metrics` only with `Authorization: Bearer METRICS_TOKEN`, compared in constant time, and 404 without it. Leave OpenTelemetry out and mark it "not built" in the spec. If there is no time, change `architecture.md`, `quality.md` §5 and `deploy.md` to say metrics are future work.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Spec update in the same change. `prom-client` is approved.
- Verification Method: A test that `/metrics` answers 404 without the token and 200 with it, and contains `paypal_calls_total`. After deploy, `curl -H "Authorization: Bearer …" http://127.0.0.1:8787/metrics` on the Mac.

## [BE-009] With Postgres down, routes answer `500 internal` instead of the specified `503 unavailable`

- Category: Error handling
- Severity: Low
- Status: Partially Implemented
- File: `backend/src/http/middleware/errorHandler.ts`
- Code Location: `errorHandler.ts:11-24` (`toAppError`); compare `health.service.ts:20-27`
- Description: `architecture.md` "Failure behavior" and `api.md` define `503 unavailable` with "Foldback is temporarily unavailable" when Postgres is unreachable.
- Current Implementation: Only `GET /api/health` maps a database failure to `unavailable`. Every other route turns a `pg` connection error (ECONNREFUSED, connect timeout, `57P01` admin shutdown, `08xxx`) into `500 internal`, logged as "unhandled error".
- Problem: Clients get "Something went wrong on our side" instead of a retryable 503, and the logs mark an expected outage as a bug.
- Why It Matters: Small, but it is a spec/code disagreement on a documented failure mode.
- Recommended Solution: In `toAppError`, map Node network error codes (`ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT`), the pool's connect-timeout error, and SQLSTATE classes `08` and `57P` to `new AppError("unavailable", "Foldback is temporarily unavailable.")`, with a `Retry-After` header.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: A test that builds the app with a pool pointing at a closed port and expects `503 unavailable` from `GET /api/contracts`.

## [BE-010] A deploy during a capture wave can kill the process between a PayPal call and its record

- Category: Reliability / shutdown
- Severity: Low
- Status: Partially Implemented
- File: `backend/src/server.ts`, `deploy/compose.yml`
- Code Location: `server.ts:11` (`SHUTDOWN_GRACE_MS = 10_000`), `:37-53`; `compose.yml` backend service (no `stop_grace_period`)
- Description: Docker's default stop timeout is 10 s, and the app's own shutdown cap is also 10 s. A capture wave makes up to 4 sequential PayPal calls of up to 15 s each.
- Current Implementation: On SIGTERM the HTTP server stops accepting connections and waits for in-flight requests, but Docker sends SIGKILL at 10 s. A resolve still in its wave is killed. The design makes this safe: tx1 already marked the share `capture_unknown`, so the plan pauses and sync settles it.
- Problem: CI auto-deploys every merge to `main` within 5 minutes, so a deploy during a judge's live demo would leave a "Paused" plan that needs Check payment.
- Why It Matters: Nothing is lost, but the demo stops at the worst moment.
- Recommended Solution: Set `stop_grace_period: 75s` on the backend service, and `SHUTDOWN_GRACE_MS` to about 70 s (4 × 15 s plus margin). Optionally pause auto-deploys from 1 to 15 December (pin `BACKEND_TAG=sha-…`, see BE-021).
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Changes in `deploy/` and `~/foldback/compose.yml` on the Mac (owner).
- Verification Method: Start a resolve whose PayPal fake sleeps 20 s, send SIGTERM, and expect the wave to finish before exit.

## [BE-011] Nothing alerts the team if the API goes down during judging

- Category: Monitoring
- Severity: Low
- Status: Missing
- File: `deploy/`, `docs/spec/deploy.md`
- Code Location: not applicable
- Description: The deploy job logs to `~/Library/Logs/foldback-deploy.log` on the Mac. No uptime check, no notification on a failed deploy or rollback, and no alert when `/health/ready` turns 503.
- Current Implementation: Problems are found when someone opens the app.
- Problem: The backend runs on one Mac mini at home (power, network, Colima). Judging runs 1 to 15 December and judges are not required to tell anyone the app was down.
- Why It Matters: A dead API during judging means a broken build for Stage One's "working build" check.
- Recommended Solution: A free external check of `https://api.foldback.tech/health/ready` every 5 minutes with an e-mail alert (any free uptime service the owner already uses; no code change, no new dependency). Optionally have `deploy.sh`'s `rollback` post to the same channel. Cross-ref J-NISHIT-010 ("keep the demo alive").
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Owner's choice of service.
- Verification Method: Stop the backend container for 10 minutes on a test day and confirm the alert arrives.

## [BE-012] Request logs record every pay-link id, which is the payment capability

- Category: Logging of sensitive data
- Severity: Low
- Status: Implemented (leaks a capability into logs)
- File: `backend/src/http/middleware/requestLogger.ts`
- Code Location: `requestLogger.ts:10`
- Description: Each request line logs `req.path`, for example `/api/shares/shr_…/checkout`. The share id is the only permission needed to view the pay page and start a checkout.
- Current Implementation: Logs stay on the Mac (json-file driver, 3 × 10 MB rotation).
- Problem: Anyone who can read the container logs can act on any friend's pay link for the plan's life.
- Why It Matters: Low risk on a one-operator Mac, but logs tend to get pasted into issues and chats.
- Recommended Solution: Log the route pattern (`req.route?.path` joined with `req.baseUrl`, for example `/api/shares/:id/checkout`) instead of the concrete path, or mask `shr_` ids to their first 6 characters.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: Extend `logger.test.ts` or a route test to assert no `shr_` id of 22 characters appears in captured log output.
