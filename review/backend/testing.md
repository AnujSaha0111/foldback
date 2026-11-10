# Backend testing

Owner: Manveer. Reviewed on 10 November 2026 at commit `196f4f9`. The LLM stub (`backend/test/helpers/llmStub.ts`) and the AI suites are Ravi's area.

## What was run

On Windows 11 with a portable Node 24.22.2 (checksum-verified from nodejs.org) and Yarn 4.9.2 through Corepack, against `postgres:16` in the throwaway Compose project `foldback-review` on port 5433 (`TEST_DATABASE_URL=postgres://foldback:foldback@localhost:5433/foldback_test`). No `backend/.env` exists, so no other database or key was in reach.

| Gate | Result |
|---|---|
| `yarn format:check` | Pass |
| `yarn typecheck` | Pass |
| `yarn lint` | Pass |
| `yarn knip` | Pass |
| `yarn dup` | Pass: 1 clone, 8 lines (0.11 %), under the 2 % threshold |
| `yarn build` | Pass |
| `yarn sync-types --check` | Pass |
| `yarn npm audit --severity high` | Pass, "No audit suggestions" |
| `yarn test --coverage` | Pass: 500 project tests (239 unit, 261 integration, 37 suites) plus 4 temporary probe tests, all green. Coverage: `src/domain` 99.52 % lines, `src/services` 96.19 % lines, both over the 85 % gate. All files: 97.06 % lines, 86.97 % branches. |

The temporary probe (`backend/test/integration/zz-audit-temp.test.ts`) proved BE-001, BE-002 and BE-022 and was deleted afterwards; `git status` was clean.

## What the suite already proves well

- Every row of the `paypal.md` "Negative tests the adapter must support" list has a test: replayed authorize with one key, authorize timeout then `money_unknown`, capture timeout with zero further calls, void timeout with no second void, and `PAYPAL_ENV=live` refused at boot.
- Races are tested with real concurrency against Postgres: two checkouts, two authorizes, two resolves, four concurrent resets, the guest sweep beside an in-flight authorize.
- The schema's rules are tested directly (`schema.test.ts`, `statuses.test.ts`, `operations.test.ts`), so a code bug that tries an illegal move fails at the database too.
- `paypalClient.test.ts` (547 lines) covers classification, 204 voids, `RESOURCE_CONFLICT`, unparseable bodies, a reply that breaks mid-body, redirects refused, token caching and dropping, and buyer-data stripping.

## [BE-026] Some money and lock edge paths have no test

- Category: Test coverage
- Severity: Medium
- Status: Missing
- File: `backend/test/integration/resolve.test.ts`, `hold.test.ts`, `tx.test.ts`
- Code Location: uncovered lines from this run's coverage report:
  - `src/db/tx.ts:39`: the 5-holder cap refusal.
  - `src/services/resolve.service.ts:341-346`: a void PayPal refuses while the authorization is still `CREATED` (share back to `held`, plan paused, `502 paypal_failed`).
  - `src/services/resolve.service.ts:139`: a `blocked` plan returning to `active` before the deadline.
  - `src/services/sync.service.ts:187-193`: a lost capture that PayPal did capture (authorization `CAPTURED`, then GET order for the capture id).
  - `src/services/clock.service.ts:61`, `:64`: the clock refused on an unconfirmed plan and on a decided one.
- Description: The paths above are reachable and handle money or the lock. Each is a few lines and reads correctly, but none is exercised.
- Current Implementation: Overall coverage is high, so these lines do not trip the 85 % gate.
- Problem: `sync.service.ts:187-193` is the happy path of recovering a lost capture, the scenario the project's money-safety story leans on most, and it is untested. BE-001's transient-4xx case is also missing.
- Why It Matters: These are the questions a payments reviewer asks first ("walk me through a capture whose reply is lost").
- Recommended Solution: Add one test per path with the existing `scriptedPayPal` and `setup()` helpers in `resolve.test.ts`:
  1. Capture times out → sync answers `CAPTURED` + order with a capture → share `kept` → next resolve finishes `kept` with zero further capture calls.
  2. Void answered 422 with the authorization `CREATED` → share `held`, `blocked`, `502`; then a resolve answered 204 → `released`, one void key across both calls.
  3. Six locked functions on six contracts → exactly one `409 resolve_in_progress`.
  4. Capture answered 429 (after BE-001's fix) → paused, then kept on retry.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: BE-001 for case 4.
- Verification Method: The coverage report shows those lines covered.

## [BE-027] The PayPal fake replays a script; it does not model PayPal, and no real sandbox run of the edge cases is recorded

- Category: Test fidelity
- Severity: Medium
- Status: Needs Verification
- File: `backend/test/fixtures/paypal.ts`
- Code Location: `scriptedPayPal` (`paypal.ts:87-113`)
- Description: The fake answers each call from a queue of scripted replies. It records requests (so tests can assert keys and counts), but it has no state: it does not replay the first answer for a repeated `PayPal-Request-Id`, does not track an order's or authorization's status, and does not refuse a capture of a voided authorization by itself.
- Current Implementation: Tests assert our reaction to the replies PayPal is documented to send. That is the right unit of test, and the scripts follow `paypal.md`.
- Problem: Nothing shows that sandbox PayPal really answers these cases as scripted: a replayed capture key after a lost reply, `ORDER_ALREADY_AUTHORIZED` on a repeated authorize, a void of a captured authorization, a capture of an expired one, 429 bodies. Nishit's Karthik Ravi evaluation notes the same gap. Cross-ref J-NISHIT-009.
- Why It Matters: The unknown-result model is the project's strongest technical claim. Its evidence is currently "our fake agrees with our spec".
- Recommended Solution: Without adding a dependency, write a one-off script under `backend/scripts/` that runs against the sandbox with the real client: create order → approve by hand in the browser → authorize twice with the same key → capture → capture again with the same key → void the captured authorization → GET order. Record the status codes, `name`, `issue` and debug ids into `docs/spec/paypal.md` as "Observed in sandbox on <date>". Optionally turn the fake into a small stateful model for the four calls later; not before submission.
- Implementation Complexity: Low (the script), Medium (a stateful fake)
- Breaking Change Risk: Low
- Dependencies: Sandbox credentials on a team machine (never in the repository or chat), a sandbox buyer login.
- Verification Method: The recorded table in `paypal.md`, reviewed by a second maker.
