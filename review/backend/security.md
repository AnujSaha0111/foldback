# Backend security

Owner: Manveer. Reviewed on 10 November 2026 at commit `196f4f9`. Auth and authorization have their own file (`auth.md`). Frontend security headers and Vercel config are Ravi's (`review/misc/`).

Tools: no automated security scanner ran on this branch; the tools table in `review/reports/manveer.md` says why. The checks below were done by reading the code and by single read-only requests to production.

## Verified as implemented

| Check | Evidence |
|---|---|
| SQL injection | Every repository calls `query(text, values)` with `$n` parameters. A lint rule refuses template literals with `${` as the first argument of `.query(`. The one exception, `insertSeedShares` (`shares.repo.ts:212-223`), interpolates only generated `$n` placeholders, never values, and is fenced with an explained `eslint-disable`. |
| Mass assignment | Every body goes through a `z.strictObject` (unknown keys refused, `400 bad_request` with paths). Services copy named fields only. Checkout, resolve, logout, guest and reset take `{}` and nothing else. |
| IDOR | See `auth.md`: owner checks in the service layer for every contract route and socket room. Pay routes are public by design. |
| Body limit | `express.json({ limit: "32kb" })`, mapped to `413 payload_too_large`. Socket.IO `maxHttpBufferSize: 100_000`. |
| Helmet | Production `GET /api/health` returns `Content-Security-Policy`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy: same-origin`. No `X-Powered-By`. |
| CORS | Allow-list from `CORS_ORIGINS`, normalised to origins, credentials on. A production preflight from `https://evil.example` received no `Access-Control-Allow-Origin`. |
| Cookies | See `auth.md`. |
| Secrets in env | All secrets come from env (`env.ts`), the PayPal token is held in memory and never logged, the database password goes in `PGPASSWORD`, not the URL. `.env` files are gitignored; no `backend/.env` exists in this clone. gitleaks scans the whole history in CI. |
| Logging of sensitive data | Redaction at any depth (`logger.ts`). PayPal operation rows drop `payer`, `payment_source` and `shipping` before storage (`client.ts:175-191`), so the buyer's name, email and address never reach the database. One gap: BE-012 (pay-link ids in request logs). |
| Dependency risk | `yarn npm audit --severity high` on 10 November: "No audit suggestions". Yarn `enableScripts: false` (install scripts disabled). All GitHub Actions are pinned to commit SHAs. |
| Error leakage | Only `AppError` messages reach clients; anything else is `500 internal` with the stack in the log only (`errorHandler.ts`). |
| Live-money guard | PayPal base URL and `PAYPAL_ENV` are literals in the env schema, so the server cannot boot against live PayPal (`env.ts:55-62`). |
| `/metrics` exposure through the tunnel | `GET https://api.foldback.tech/metrics` answers `404` (the route is not built, BE-008), so nothing is exposed. When it is built, it must require the token (BE-008). |

## [BE-016] Query strings are not validated by a schema, although the spec says they are

- Category: Input validation / spec drift
- Severity: Informational
- Status: Partially Implemented
- File: `backend/src/controllers/contracts.controller.ts`
- Code Location: `contracts.controller.ts:42-49` (`req.query["via"] === "agent"`)
- Description: `api.md` says bodies, params and query strings are validated with zod strict objects and unknown keys are refused. The only query parameter, `?via=agent`, is read ad hoc, and unknown query keys are ignored on every route.
- Current Implementation: Safe: the value is only compared with a literal, and it only adds an audit event.
- Problem: Spec and code disagree. A future query parameter would have no validation pattern to follow.
- Why It Matters: Consistency with the documented security checklist (`quality.md` §6, first item).
- Recommended Solution: Add `validateQuery(z.strictObject({ via: z.literal("agent").optional() }))` on the clock and resolve routes, beside `validateBody`, or narrow the sentence in `api.md` to bodies and params.
- Implementation Complexity: Low
- Breaking Change Risk: Low (a stray query key would start returning 400)
- Dependencies: None
- Verification Method: A route test with `?via=other` expecting `400 bad_request`.
