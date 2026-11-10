# Architecture and API design

Owner: Manveer. Reviewed on 10 November 2026 at commit `196f4f9`.

Files read: `backend/src/app.ts`, every file in `routes/`, `controllers/`, `http/`, the services named in `paypal-money-flows.md`, plus `contracts.service.ts`, `shares.service.ts`, `projection.service.ts` (shape only). Specs: `architecture.md`, `api.md`.

## Verified as implemented

| Check | Evidence |
|---|---|
| Layering | Routes hold paths and middleware only. Controllers parse the validated input, call one service and shape the reply. Services own transactions. Repositories hold SQL only and take a `Pool` or `PoolClient` so services set the transaction boundary. `domain/` imports only `./` files, `shared/`, `luxon` and `zod`: it is pure. `integrations/paypal` never imports `db`, `repositories` or `services`. Exceptions are type-only or constants (BE-018). |
| `decide` is shared by resolve and the simulator | `resolve.service.ts:66` and the agent's `simulate_outcome` call the same `domain/decide`, so a simulation cannot drift from the rule (Ravi checks the agent side). |
| One money mutation per service function | Checkout (`startCheckout`), authorize (`authorizeShare`), sync (`syncShare`), resolve (`runResolve` via `resolveOwned` / `moveClock`). Each follows tx1 → PayPal → tx2. |
| Status codes | `http/errors.ts` `ERROR_STATUS` lists every code in `api.md`'s table with the same HTTP status (28 codes, checked one by one). A lost PayPal reply is `200 outcome: unknown`, not a 502, as `api.md` requires. Another user's plan is 404, never 403. |
| zod at every trust boundary | Env (`env.ts`), every request body (strict objects), route ids (regex, malformed → 404), socket payloads (`io.ts:38-39`), PayPal replies (`client.ts:258-354`: a 2xx that does not match the schema is `unknown`, never success), JWT claims. Query strings are the exception (BE-016). |
| Error handling | Express 5 forwards async throws. One error JSON shape `{ error, message, request_id }`, plus `details` for validation and extra fields for the few errors that carry data (`needs_clarification`, the clock's `contract_read`). Unknown errors become `500 internal` and are logged with the stack. |
| Realtime | Sockets carry ids and a version, never state; notification happens only after the transaction commits (every `notify` call follows a `withTransaction` that returned). |

## [BE-017] Several spec statements no longer match the code

- Category: Documentation / spec drift
- Severity: Low
- Status: Needs Verification (by the spec owners)
- File: `docs/spec/README.md`, `docs/spec/architecture.md`, `docs/spec/deploy.md`
- Code Location: listed below
- Description: The team rule is to report a spec-versus-code disagreement, not pick a side (`docs/spec/README.md:81`, "Stop and ask"). Found during this audit:
  1. `docs/spec/README.md:54-65`: the phase table says phase 5 is in progress and phases 6 to 9 are blocked. Phases 6 to 8 are merged (pay link, resolve, agent are all in `main` and pass their tests).
  2. `architecture.md:20` puts Gemini first in the AI chain; `README.md:23`, `paypal.md:19` and `env.ts:5` put DeepSeek first. The chain itself is Ravi's area; cross-reference his AI review.
  3. `architecture.md:66`, `:69` and `:75` list `observability/metrics.ts`, `otel.ts`, `routes/agent` and `integrations/llm/agentTools.ts`. There is no metrics or OpenTelemetry code (BE-008), the agent route is in `contracts.routes.ts`, and `agentTools` is in `services/`.
  4. `architecture.md:252` vs `api.md:32` on email enumeration (BE-014).
  5. `paypal.md:156-157` vs `sync.service.ts` on re-holding a lost capture (BE-003).
  6. `deploy.md:163` says a rollback restores the old backend after a migration; in fact the old backend refuses to boot (BE-022).
  7. `deploy.md:210` gives a `/metrics` command that cannot work (BE-008).
  8. `api.md:5` on query-string validation (BE-016).
- Current Implementation: Code is ahead of or different from the spec in each case.
- Problem: The repository becomes public on 11 November, and `docs/spec/` is the most detailed thing a developer-relations judge will read.
- Why It Matters: A spec that overclaims (metrics, rollback) costs more credibility than one that states limits.
- Recommended Solution: One docs-only change by the spec owner that fixes the eight items, or marks each "not built" or "future work".
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: The decisions in BE-003, BE-008, BE-014, BE-016 and BE-022.
- Verification Method: Re-read each line after the change.

## [BE-018] A few imports cross the layering rules, all type-only or constants

- Category: Architecture
- Severity: Informational
- Status: Implemented (minor exceptions)
- File: `backend/src/http/cookies.ts`, `backend/src/http/middleware/auth.ts`, `backend/src/controllers/auth.controller.ts`, `backend/src/integrations/llm/client.ts`
- Code Location: `cookies.ts:3` (imports `SESSION_TTL_SECONDS` from `services/token`); `middleware/auth.ts:6` (calls `services/session.userFromToken`); `auth.controller.ts:6` (type `User` from `repositories/users.repo`); `integrations/llm/client.ts:3` (types from `services/aiBudget.service`, Ravi's area)
- Description: `architecture.md` says a layer may only call the one below it and `integrations/` is called only by services.
- Current Implementation: The auth middleware calling a session service is the usual Express pattern and keeps HTTP and sockets on one code path, which is a good reason. The rest are type or constant imports.
- Problem: None at runtime.
- Why It Matters: Only if the team wants a lint rule for layering later.
- Recommended Solution: Move `SESSION_TTL_SECONDS` and the `User` type to `shared/` or a `types` module if the team adds an import-boundary lint rule. Otherwise leave it.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: `grep` the imports again.
