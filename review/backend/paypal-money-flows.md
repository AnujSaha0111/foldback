# PayPal money flows

Owner: Manveer. Reviewed on 10 November 2026 at commit `196f4f9` (branch `review-manveer`).

Scope: checkout, authorize, sync, resolve (capture and void waves), the demo clock and the `?via=agent` approvals.

Files read in full:
- `backend/src/services/holds.service.ts`, `sync.service.ts`, `resolve.service.ts`, `clock.service.ts`
- `backend/src/domain/decide.ts`, `payable.ts`
- `backend/src/integrations/paypal/client.ts`, `keys.ts`
- `backend/src/repositories/operations.repo.ts`, `shares.repo.ts`
- `backend/src/db/tx.ts`
- `backend/migrations/0001_init.sql`

Specs compared: `docs/spec/paypal.md`, `docs/spec/architecture.md` (money state machine, resolve rules, concurrency) and `docs/spec/api.md`.

Method: read the code against the spec, ran the full backend suite on a throwaway Postgres (500 project tests pass), and ran a temporary probe test (`backend/test/integration/zz-audit-temp.test.ts`, now deleted) that used the project's own PayPal fake to prove BE-001 and BE-002. The probe's exact output is quoted in each finding.

## Invariants verified as implemented

Each row was checked in the code and, where marked, by an existing test that passed in this run.

| Invariant | Where it holds | Evidence |
|---|---|---|
| Idempotency key per PayPal object | `integrations/paypal/keys.ts`: `fb-order-{share}-{attempt}`, `fb-auth-{order}`, `fb-capture-{auth}`, `fb-void-{auth}`. `client.ts:426` sends it as `PayPal-Request-Id` on every POST; the `PayPalRequest` type makes a POST without a key a compile error (`client.ts:22-24`). | `hold.test.ts` "stores the existing hold on a replay, with one key across calls (test 51)"; `resolve.test.ts` test 67 |
| Operation row is born `pending`, before the call | `operations.repo.ts:32-43`; the database refuses any other birth for a write (`ops_insert_guard`, `0001_init.sql:552-555`) | `operations.test.ts` "records a write before it is sent, then its result" |
| One in-flight write per share; a live key cannot be reused | Partial unique indexes `ops_one_inflight_per_share` and `ops_one_live_per_key` (`0001_init.sql:225-231`). A key frees up only after a `failed` outcome | `operations.test.ts` "refuses a live key used again, and allows it after a failure"; `hold.test.ts` "sends one authorize when two requests race (test 54)" |
| No PayPal call inside a database transaction | Every write is tx1 (`beginCheckout`, `beginAuthorize`, `startCall`) → HTTP → tx2 (`finishCheckout`, `finishAuthorize`, `finishCall`). The client never touches the database (`client.ts:6-7`) | Read every call site. `hold.test.ts` "is marked unknown before the call, so a crash during it cannot free the share" |
| Contract advisory lock, capped at 5 holders per process | `tx.ts:35-90`: `pg_try_advisory_lock(hashtextextended(id,0))` on a dedicated connection, unlock in `finally`, the connection is destroyed if unlock fails. Taken by authorize, sync, resolve and clock. Checkout does not take it, and needs no lock: its tx1 locks the contract row, and resolve skips a share with an open call | `tx.test.ts` (5 cases); `resolve.test.ts` test 75. The cap path itself is untested, see BE-026 |
| A lost reply never frees a share | Authorize sets `authorize_unknown` in tx1 (`shares.repo.ts:140-145`). Capture and void set `capture_unknown` / `void_unknown` in tx1 (`resolve.service.ts:168-181`). Only sync moves a share out of an unknown status. Expiry of a share with an open call is refused by the schema (`shares_guard`, `0001_init.sql:467-474`), and the release wave skips it (`decide.ts:38`) | `hold.test.ts` tests 53 and 55; `resolve.test.ts` test 66 |
| Capture only in the keep direction | In three layers: `runResolve` captures only when the wave is `keep` (`resolve.service.ts:394-397`); the trigger `shares_capture_requires_keep` (`0001_init.sql:458-464`); the trigger `ops_capture_requires_keep` (`0001_init.sql:556-559`). `direction` is write-once (`0001_init.sql:340-343`) | `schema.test.ts`, `statuses.test.ts`, `resolve.test.ts` release cases (no capture call) |
| A wave stops at the first unclear result | `captureOne` and `releaseOne` throw on unknown, unsent or refused (`pauseOnUnknown`, `pauseUnsent`), so the `for` loop at `resolve.service.ts:394` ends | `resolve.test.ts` tests 66 and 68 |
| Replays are read, not assumed | `ORDER_ALREADY_AUTHORIZED` → GET order (`holds.service.ts:208-217`); capture 4xx → GET order (`resolve.service.ts:288-303`); void 4xx → GET authorization (`resolve.service.ts:334-339`). An unreadable read stays unknown | `hold.test.ts` "stays unknown when a replay's read shows no usable hold"; `resolve.test.ts` "pauses as unknown when a refused capture's order cannot be read" |
| Amounts come from the server only | Checkout and authorize take no amount (`emptyBodySchema`, `authorizeSchema` accepts only `order_id`). Cents become a decimal string only in `client.ts:55-57` | `hold.test.ts` "refuses a body, so the browser can never send an amount" |
| The authorize `order_id` must equal the stored one | `holds.service.ts:183-185` | `hold.test.ts` test 52 |
| `?via=agent` only labels an approval | `clock.service.ts:37-38` and `:72-73` write `agent_proposal_approved`; the rule and the lock are the same as a manual click. No agent tool calls PayPal (Ravi's area, not re-audited) | Read |

## [BE-001] A rate limit or token error on capture is recorded as a permanent refusal

- Category: PayPal money flow / error classification
- Severity: High
- Status: Partially Implemented
- File: `backend/src/integrations/paypal/client.ts`, `backend/src/services/resolve.service.ts`
- Code Location: `client.ts:214-231` (`classify`), `client.ts:457`; `resolve.service.ts:284-311` (`captureOne`)
- Description: `classify` treats every 4xx with a JSON body as a definite business refusal, except `RESOURCE_CONFLICT` / `PREVIOUS_REQUEST_IN_PROGRESS`. A 429 `RATE_LIMIT_REACHED` or a 401 (expired or revoked token) means PayPal did not process the request at all, but it is classified exactly like a 422 `AUTHORIZATION_VOIDED`.
- Current Implementation: `captureOne` sends a 4xx with a non-null status down the refusal path. It reads the order, finds no capture, and calls `setShareStatus(held)`, then `setShareStatus(capture_failed)`, then `block(...)`. `decide` then returns `capture_refused` on every later resolve (`decide.ts:51`). The only "not sent" path, `pauseUnsent`, is chosen when `result.status === null` (`resolve.service.ts:286`), which a real HTTP 429 or 401 never has.
- Problem: Proven with the project's fake (four held shares, first capture answered with the given status, order read shows no capture):
  - `429 -> 409 capture_refused {"contract":"blocked","shares":{"A":"capture_failed","B":"held","C":"held","D":"held"}}`
  - `401 -> 409 capture_refused {"contract":"blocked","shares":{"A":"capture_failed","B":"held","C":"held","D":"held"}}`

  The plan can then never finish. The three other holds stay authorized at PayPal until they expire, and Foldback has no path to capture or void them (BE-002). For authorize, the same misclassification is recoverable (the share goes back to `checkout_open`); for void it is recoverable (share `held`, plan paused, next resolve voids with the same key). Only capture is terminal.
- Why It Matters: The capture wave is where the product delivers its promise. A transient PayPal condition (burst rate limiting, a token PayPal revoked before the cached expiry) turns a fully-held group into a stuck, partly-decided plan with live holds. Nobody is charged twice or wrongly, so this is not money loss, but it is a hold Foldback can no longer act on.
- Recommended Solution: Classify "PayPal did not process this request" separately from "PayPal refused it". In `classify`, return the existing `failed` shape with a flag (for example `processed: false`) for 401, 403 `NOT_AUTHORIZED`-style auth failures, 408 and 429. In `captureOne` and `releaseOne`, treat `processed: false` exactly like `status === null` (`pauseUnsent`: share back to `held`, plan paused, `502 paypal_failed`, the next resolve retries with the same key). Keep 400/422 as definite refusals. Update `docs/spec/paypal.md` "Common request rules" in the same change, because the spec currently defines every 4xx with JSON as definite.
- Implementation Complexity: Low
- Breaking Change Risk: Low (only changes which branch a 401/408/429 takes; 400/422 behaviour is unchanged)
- Dependencies: Spec change in `docs/spec/paypal.md`. Second-review pass required (money path, `quality.md` §1.7).
- Verification Method: Add two cases to `resolve.test.ts`: capture answered 429, then a second resolve answered 201 → contract `kept`, capture key identical across both calls. Same for 401 (expect a fresh token fetch before the retry).

## [BE-002] No way out of a refused capture: remaining holds are stranded and the plan is half-kept

- Category: PayPal money flow / recovery
- Severity: Medium
- Status: Missing
- File: `backend/src/domain/decide.ts`, `backend/src/services/resolve.service.ts`, `backend/migrations/0001_init.sql`
- Code Location: `decide.ts:51`; `resolve.service.ts:304-311`; `0001_init.sql:323-324` (transitions `capture_failed → void_unknown`, `capture_failed → released`)
- Description: A definite capture refusal in the middle of a keep wave leaves the plan `blocked` forever. Shares already captured stay `kept`, the refused share is `capture_failed`, and every later share stays `held`.
- Current Implementation: `architecture.md` states this on purpose ("no automatic way out"). The schema even allows `capture_failed → void_unknown → released` "so a failed capture can be voided" (review amendment R-F23), but no service, route or script uses those transitions.
- Problem: Proven with the fake (capture 1 succeeds, capture 2 refused with 422 `AUTHORIZATION_VOIDED`, then a second resolve):
  `half -> 409 capture_refused 409 capture_refused {"contract":"blocked","shares":{"A":"kept","B":"capture_failed","C":"held","D":"held"}} apiCalls 3`

  C and D's money stays held at PayPal with no button, route or runbook step to release it, and A has been charged for a plan that did not complete. The landing page promises the opposite: `frontend/src/features/landing/components/FoldScene/index.tsx:9` says "Kept or released. Never in between." BE-001 makes this state reachable without any real refusal.
- Why It Matters: A payments reviewer will ask "what happens when the third capture fails?". Today the answer is a permanent pause with live holds. That is safe (nothing moves without a decision) but unfinished, and it contradicts the product's headline.
- Recommended Solution: Add an owner-only recovery the organizer must confirm, reusing the existing release machinery: for a `blocked` keep plan with a `capture_failed` share, void every share still `held` (same `fb-void-{auth}` keys, same tx1 → PayPal → tx2 pattern), and GET then void the `capture_failed` authorization if PayPal still shows it `CREATED`. Leave `kept` shares as they are and say so in `resolution_reason`; refunds stay out of scope. If there is no time before submission, at minimum document the state in the README's money-safety section (cross-ref J-NISHIT-008), soften the landing copy (Nishit's area), and add a manual runbook step in `deploy.md`.
- Implementation Complexity: Medium
- Breaking Change Risk: Medium (a new path that voids money; needs its own tests and a second review)
- Dependencies: BE-001 (do it first, it removes the most likely way to get here). The direction trigger stays as it is: this recovery voids, it never captures.
- Verification Method: Integration test with the scripted fake: keep wave → capture 2 refused → recovery → C and D `released`, B `released` (or still `capture_failed` if PayPal reports it gone), A `kept`, contract reason names each person.

## [BE-003] Sync holds a lost capture again even when PayPal says the authorization is voided or expired

- Category: PayPal money flow / spec drift
- Severity: Low
- Status: Implemented (differs from the spec)
- File: `backend/src/services/sync.service.ts`, `docs/spec/paypal.md`
- Code Location: `sync.service.ts:171-174` (`heldAgain`), `:177-182`; `paypal.md:156-157`
- Description: The spec's sync table maps `capture_unknown` + authorization `CREATED` → `held`. Every other status not listed means "stay unknown". The code also maps `capture_unknown` + `VOIDED`, `EXPIRED`, `DENIED` or `PENDING` → `held`.
- Current Implementation: The code comment explains why: once held again, the next resolve sends the capture with the same key, PayPal refuses it, and the share ends `capture_failed`, so the plan can end instead of staying unknown. The behaviour is safe: the authorization is not `CAPTURED`, so nothing was taken, and the direction trigger still allows only a capture.
- Problem: The spec and the code disagree (team rule: report, do not pick). In between, the board shows "Held" for an authorization PayPal has already voided.
- Why It Matters: Small, but this is the one place where the read model shows a status the PayPal fact contradicts.
- Recommended Solution: Keep the code and update the `paypal.md` table with this row and its reason. Optionally, show the authorization's PayPal status in the detail panel while the plan is paused.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: Already covered: `resolve.test.ts` "holds again a lost capture whose authorization expired, so the plan can end".

## [BE-004] The operation log says `failed` for a capture or void that the replay read proved happened

- Category: Audit trail
- Severity: Informational
- Status: Implemented (imprecise)
- File: `backend/src/services/resolve.service.ts`
- Code Location: `:297-302` (capture already exists → `kept`), `:337-339` (void refused, authorization already `VOIDED`/`EXPIRED` → `released`)
- Description: In both replay paths, `finishCall` settles the write row with the original 4xx result (`outcome: failed`) while the share moves to `kept` or `released`. The read that proved the outcome is stored as its own `get_order` / `get_authorization` row.
- Current Implementation: Correct for money: the share status is right, and the key is free again because the row is `failed`.
- Problem: Someone reading `paypal_operations` for a share sees "capture failed" next to a `kept` share and must find the following read row to understand it.
- Why It Matters: Only for support and audit; PayPal support asks for the debug id of the call that mattered.
- Recommended Solution: Leave the outcome as it is (changing it would re-reserve the key), and add the share's resulting status to the event detail, or document the pattern in `data-model.md`.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: Read the rows after `resolve.test.ts` "stores the capture PayPal already made when it refuses a repeat".

## [BE-005] The deadline is the demo clock only, and authorizations are not checked against their 3-day honor period

- Category: Product rule / scope
- Severity: Informational
- Status: Implemented as specified
- File: `backend/src/domain/payable.ts`, `backend/src/domain/time.ts`, `backend/src/shared/rules.ts`
- Code Location: `payable.ts:29-39`; `time.ts:44`; `rules.ts:19`
- Description: This answers two questions from Nishit's Karthik Ravi evaluation:
  1. There is no timed resolver. A plan resolves only on the hold that completes it, a clock move, or Resolve. Payable and decide compare against `demo_now`, never the wall clock, so a real plan nobody touches keeps its holds until PayPal expires them.
  2. Deadlines and grace times further than 29 days from the paste time are refused by the extraction validator (`AUTHORIZATION_WINDOW_DAYS`). The 3-day honor period is not enforced; `paypal.md` puts reauthorization out of scope and asks the README to state the limit.
- Current Implementation: Deliberate, for a deterministic demo (`architecture.md`, "Out of process").
- Problem: None for the hackathon. For real use it is the first thing to build.
- Why It Matters: Judges with a payments background may ask "who presses Resolve at 6 pm on Friday?".
- Recommended Solution: Say it in the README "What's next": a scheduled resolver keyed on the real deadline (the housekeeping loop in `server.ts` already runs every 6 hours and could run it under `withContractLock`), PayPal webhooks, and reauthorization for holds older than 3 days.
- Implementation Complexity: Medium (if built)
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: Not applicable now.
