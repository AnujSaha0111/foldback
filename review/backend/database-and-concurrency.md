# Database and concurrency

Owner: Manveer. Reviewed on 10 November 2026 at commit `196f4f9`.

Files read: `backend/migrations/0001_init.sql` (all 649 lines), `0002_ai_usage_deepseek.sql`, `backend/src/db/*.ts`, every file in `backend/src/repositories/`, `backend/src/services/demo.service.ts`, `housekeeping.service.ts`, `seed.service.ts` (seed shape only), and `docs/spec/data-model.md`. The integration suite ran against `postgres:16` on port 5433 (throwaway container, project `foldback-review`).

## Verified as implemented

| Area | Evidence |
|---|---|
| Constraints carry the rules | Money math in bigint (`contracts_money_math`), headcount 2 to 4, share ceiling $10,000, write-once `direction`, `authorization_id` and `capture_id`, confirmed terms frozen (`contracts_guard`), share set must match the terms at commit of confirm (deferred `contracts_activation_check`), sample rows can never carry PayPal ids. `schema.test.ts` and `statuses.test.ts` exercise them. |
| Transition tables | `contract_transitions` and `share_transitions` are data, and `contracts_guard` / `shares_guard` refuse any other move with SQLSTATE 23514. The tables match the state diagram in `architecture.md`, plus R-F23 (`capture_failed → void_unknown / released`), which no code uses yet (BE-002). |
| Least privilege | The app connects as `foldback_app` with DML only. It cannot delete from `paypal_operations`, `events` or `ai_usage`, cannot disable triggers, and cannot edit the transition tables (`0001_init.sql:639-649`). `demo.test.ts` "deletes rows older than 90 days as the owner, and the app role cannot". |
| Live money cannot be deleted | `shares_delete_guard` refuses deleting a held, unknown or `capture_failed` sandbox share, or one with an authorize, capture or void call open. Demo reset maps that refusal to `409 live_money`. The guest sweep's `NOT EXISTS` mirrors the guard exactly, so one guest with live money is skipped instead of failing the whole sweep (`users.repo.ts:105-118`). |
| Lock order (no deadlock found) | Every money transaction locks the contract row first (`lockContractRow`, `SELECT … FOR UPDATE`), then touches shares, then operations. Reset and the guest sweep delete from the top (user → contracts → shares), which takes the same contract-before-share order. The share insert guard takes `FOR NO KEY UPDATE` on the contract. I found no path that locks a share and then its contract. |
| Races checked | Checkout vs resolve: both lock the contract row; resolve skips a share with an open create (`decide.ts:38`), and checkout refuses once `direction` is set. Authorize vs resolve and sync: same advisory lock. Reset vs any money call: the delete guard refuses once tx1 has marked the share unknown; before that, the call finds no share and answers `404` (`hold.test.ts` "answers 404, not 500, when a reset deletes the plan during the call"). Guest sweep vs authorize: same guard. Two confirms: one share set (`api.md`, tested in `extract.test.ts`). |
| Indexes for the hot paths | `contracts_owner`, `events_contract (contract_id, id DESC)`, `ops_share`, the unique keys on `shares (contract_id, …)`, `users_guest_expiry`. Read models load shares and events with one query each, no N+1. |
| Pool | 10 connections, 5 s statement timeout, 5 s connect timeout (`db/pool.ts`), matching `quality.md` §5. |

## [BE-006] The whole-demo cap of 200 plans counts every member's plans forever, so judges can be refused new plans

- Category: Capacity / judge-facing availability
- Severity: Medium
- Status: Needs Verification
- File: `backend/src/repositories/contracts.repo.ts`, `backend/src/shared/rules.ts`, `backend/src/services/extract.service.ts`
- Code Location: `contracts.repo.ts:315-321` (`countOwnPlans` with a null owner); `rules.ts:47` (`MAX_DEMO_CONTRACTS = 200`); `extract.service.ts:218-219`
- Description: Creating a plan is refused with `429 demo_full` once 200 non-sample plans exist across all users.
- Current Implementation: The count includes every non-sample plan, including drafts, `needs_clarification` plans, and every member's plans, which are never pruned. Guests' plans disappear only when the guest expires (7 days), and a guest holding live money is never removed.
- Problem: I could not read the production count (production is off limits for this audit). Team testing since October, plus judges and visitors from 1 to 15 December, all draw from the same 200. Once it is reached, "Read the plan" fails for everyone, including judges.
- Why It Matters: Creating a plan from a pasted chat is the AI half of the demo.
- Recommended Solution: Before 1 December, have the Mac owner run a read-only count as the owner role: `SELECT count(*) FROM contracts WHERE seed_key IS NULL;`. Then either raise `MAX_DEMO_CONTRACTS` (the real cost bound is the AI daily cap in Postgres, not this number), or exclude drafts that never reached `active` and are older than a day. Delete the team's own test accounts before judging.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Access to the production host (owner only).
- Verification Method: The count query above, re-run on 1 December and mid-judging.

## [BE-007] Pool sizing leaves little room during a burst of lock holders, and the cap path is untested

- Category: Concurrency / capacity
- Severity: Informational
- Status: Implemented
- File: `backend/src/db/tx.ts`, `backend/src/db/pool.ts`
- Code Location: `tx.ts:35-51`
- Description: Each lock holder keeps one connection for its whole run, including PayPal calls (up to `PAYPAL_TIMEOUT_MS` = 15 s each). It opens a second connection for each of its short transactions. With 5 holders, peak use is 10 connections, the whole pool, for the few milliseconds when all five are inside a transaction at once.
- Current Implementation: The cap is a module-level counter per process. A sixth holder gets `409 resolve_in_progress` and the pay page retries. Reads that find the pool full wait up to 5 s (`connectionTimeoutMillis`) and then fail as `500 internal`.
- Problem: None observed at hackathon scale. The cap's refusal branch (`tx.ts:39`) is the only uncovered line in the lock path (coverage report), see BE-026.
- Why It Matters: The spec cites this cap as the reason the pool cannot starve. It holds on paper, but nothing exercises it.
- Recommended Solution: Add one test that starts 6 locked functions on different contracts and expects exactly one `resolve_in_progress`. No code change needed.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: The test above.
