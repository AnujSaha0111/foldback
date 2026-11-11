# Tests

```bash
cd backend && yarn test        # unit + integration (needs TEST_DATABASE_URL, from deploy/compose.dev.yml)
cd frontend && yarn test       # unit + component
```

- **Backend:** Jest 30 + ts-jest + supertest.
  - `test/unit/` holds pure `domain/` code: no database, no network.
  - `test/integration/` runs against a real Postgres 16 test database. The schema is migrated once per run, and tables are truncated between tests.
  - PayPal is a mocked `fetch`. The LLM is a stub client injected into the LLM integration. Tests never touch the network.
- **Frontend:** Jest 30 + React Testing Library for `lib/format`, the RTK Query error mapping, and key components (status pill, Pay page states).
- **CI** runs `typecheck`, `lint`, and `test` for both packages. Merging is blocked when any of them fails.

Tests are one gate among several. Every change must also pass the other gates in `quality.md` §7 (knip, jscpd, audit, gitleaks, Lighthouse CI).

A case belongs to the phase that names it. Don't add cases beyond this list unless a bugfix needs one assertion on an existing route.

Fixtures: `backend/src/shared/rules.ts` (demo strings) and `backend/test/fixtures/` (model stubs, PayPal response builders, a user factory, a sandbox contract factory).

## Reading a failure

- Schema test fails → a constraint or trigger is wrong (or missing).
- Validator test fails → a bug in the rule reader.
- Resolve test fails, but with the expected PayPal call count → an engine bug.
- Wrong PayPal call count or `PayPal-Request-Id` → an idempotency bug.
- A database refusal (`23514`, `23505`) during a feature test → a service bug the schema caught. Fix the service, never the constraint.
- Manual sandbox failures go into the phase exit note with HTTP status, PayPal `name`, `issue`, and `debug_id`.

## Phase 1: `test/integration/schema.test.ts`

All 31 cases run as the **non-owner application role** `foldback_app` (DML grants only). The owner connection is used only to rebuild the schema, truncate between tests, and to prove that the owner is also stopped by triggers. Fixtures walk the real lifecycle (draft, shares and confirm in one transaction, create order, authorize, capture or void), because the schema refuses rows that skip it.

1. `migrations apply and are idempotent`: a second run applies nothing, `status` shows `0001`, the checksum matches.
2. `money math is enforced`: total 100, share 30, headcount 3 raises `contracts_money_math`. A huge share is a `23514` refusal, never a `22003` overflow.
3. `an illegal transition is rejected, a legal update bumps the version`.
4. `direction is write-once`.
5. `confirmed terms are frozen`, including `rule_hash`.
6. `sample rows hold no PayPal ids`, seeds insert directly in their final status, and an operation on a sample share raises `ops_sandbox_only`.
7. `a contract cannot mix sample and sandbox shares` (`shares_contract_fk`, `23503`).
8. `a held sandbox share needs its authorization id`.
9. `only one mutating PayPal call can be in flight per share` (`ops_one_inflight_per_share`).
10. `a key has one live row`: replay raises `ops_one_live_per_key`, and a retry after `failed` is allowed.
11. `a contract has at most one grace subject`.
12. `events are append-only`: the trigger stops the owner, the missing grants stop the app (`42501` on UPDATE and DELETE).
13. `deleting a guest as the app role cascades everything and keeps ai_usage` (user set to null).
14. `ai_usage refuses paid OpenRouter models` and defaults `day` to the UTC date.
15. `a share amount must equal the contract share`.
16. `the authorization id is write-once`.
17. `an illegal share transition is rejected`.

Cases added by the independent review (prefix `N`):

- N1. `a sandbox contract cannot be born kept` (`contracts_insert_state`).
- N2. `a sandbox share is born waiting, inside the headcount, and never after confirm`.
- N3. `confirm commits only if shares match headcount, amount, and grace subject` (`contracts_shares_match_terms`, raised at COMMIT).
- N4. `nothing is captured unless the decision is keep` (`ops_capture_requires_keep`, `shares_capture_requires_keep`).
- N5. `a share with an authorize in flight cannot be expired`.
- N6. `a guest with a live hold cannot be deleted, and can after the hold is released` (`shares_live_money_undeletable`).
- N7. `the operation log is born pending, moves legally, and settled rows are frozen`.
- N8. `an event's share must belong to the event's contract`.
- N9. `a capture id never sits on a released share`.
- N10. `the UTC timezone is accepted, and confirmed_at only exists after confirm`.
- N11. `the app role cannot disable triggers, edit transitions, or delete the operation log`.
- N12. `happy path`: hold all, keep, capture through an unknown plus sync, kept.
- N13. `a failed capture's authorization can still be voided`.
- N14. `a share insert locks its contract, so a concurrent confirm waits` (`55P03` under a short `lock_timeout`).

## Phase 3: `test/integration/{auth,health,contracts-read}.test.ts`

15. `env fails fast`: a missing `JWT_SECRET`, a short `JWT_SECRET`, or `PAYPAL_ENV=live` → the env parser throws with the variable name.
16. `health`: `/health/live` 200. `/health/ready` 200 with the database up, and 503 when the pool is pointed at a dead port.
17. `signup sets an httpOnly cookie and seeds`: 201, the `Set-Cookie` is `HttpOnly; Secure; SameSite=Lax`, and the user has exactly the two sample plans.
18. `login does not reveal emails`: wrong password and unknown email return the same 401 body.
19. `guest account`: 201 with `kind: guest`, `expires_at` 7 days out, and two sample plans.
20. `ownership`: user B reading user A's contract → 404.
21. `origin check`: a POST without an allowed Origin → 403 `bad_origin`.
22. `reset is per user`: A's reset leaves B's plans untouched, and A has exactly two seeds again.
23. `seed shape`: the cabin has Alex, Sam, and Jordan `held`, Maya `waiting` and the only grace subject, amounts 8000, and the deadline, grace, and `demo_now` from `data-model.md`. The print run has four `held`.
24. `sample rows have no PayPal ids` and `read model hides secrets`: no `approve_url`, no password hash, no idempotency keys in any response.
25. `logger redacts secrets`: logging an object with `password`, `authorization`, and `cookie` outputs `[REDACTED]`.
26. `socket join is ownership-checked`: B's `contract:join` for A's contract gets an error ack, and B receives no events.

## Phase 4: `test/unit/validateExtraction.test.ts`, `test/integration/extract.test.ts`

27. `cabin chat is complete`: the stub returns `cabin-chat` → 200 `awaiting_confirmation`, title `Cabin weekend`, grace Maya Shah.
28. `confirm inserts sandbox shares`: four `waiting` shares at 8000, `sandbox`, `demo_now` two hours before the deadline, status `active`.
29. `no-time asks, clarify completes`: 422 with `deadline_at` missing. Clarifying with "6pm Pacific" → 200. `rule_text` ends with `Organizer: 6pm Pacific`.
30. `bad math asks`: both money fields are missing.
31. `two grace people ask`: `grace_person_name` is missing.
32. `headcount 6 asks`: no shares are created.
33. `tampered confirm is rejected`: 422 `confirm_mismatch`, and the status is unchanged.
34. `bad evidence quote is dropped`.
35. `people count must match headcount`.
36. `injected price is rejected` (fixture `injected-price`).
37. `invented price is rejected` (fixture `invented-price`).
38. `server fixes the offset` (fixture `bad-offset`).
39. `refusal maps to clarification`.

## Phase 5: `test/integration/scheduler.test.ts` + frontend tests

40. `cabin event names`: Alex, Sam, and Jordan `Held`; Maya `Waiting`.
41. `markers and window`: deadline, grace, and now time ranges. `start` `2026-11-06T08:00:00-08:00`, `end` `2026-11-11T20:00:00-08:00`.
42. `print run held`: four `Held`, and no grace range.
43. `sample flag`: every event `moneySource` is `sample`, and every badge says `Sample`.
44. `contract:changed is emitted after commit`: a confirm emits once with a higher `version`. A rolled-back transaction emits nothing.
45. Frontend `format`: `8000` → `$80.00`; the deadline → `Fri 6 Nov, 6:00pm PT`.
46. Frontend `StatusPill`: renders the word for every status. Snapshot of the label map.

## Phase 6: `test/integration/hold.test.ts`

Assert the URL, method, and `PayPal-Request-Id` of every mocked call.

47. `sample checkout is refused`: 409 `sample_row`, and fetch is not called.
48. `checkout creates an AUTHORIZE order`: `payment_source.paypal.experience_context`, value `80.00`, key `fb-order-{shareId}-1`. The `approve_url` comes from `payer-action`.
49. `second checkout reuses the link`: no second create call.
50. `authorize stores the hold`: `held` with the authorization id and expiry. The contract stays `active`. Event `hold_placed`, and `contract:changed` is emitted.
51. `authorize replay`: `ORDER_ALREADY_AUTHORIZED`, then GET order → `held`. Both calls use the same key, `fb-auth-{orderId}`.
52. `order id must match`: 400, and fetch is not called.
53. `authorize timeout reserves the share`: `authorize_unknown`. The next checkout → 409 `money_unknown`.
54. `concurrent authorize`: two parallel authorize requests for one share → exactly one PayPal authorize call. The other request gets `409 money_unknown` or `resolve_in_progress`.
55. `sync completes an unknown hold`: GET order with an authorization → `held`, and the unknown operation is marked `resolved_by_sync`.
56. `buyer cancel declines, retry gets a new key`: `declined`, then the next order uses `fb-order-{shareId}-2`.
57. `public share view`: no PayPal ids, and includes `payable`, `held_count`, and `other_names`.

## Phase 7: `test/unit/decide.test.ts`, `test/integration/resolve.test.ts`

58. `decide` truth table (unit): every combination of time (before deadline / in grace / after grace), held count (2, 3, or 4 of 4), grace configured (yes or no), and direction (null, keep, release). Expected decisions are in one table.
59. `before deadline, short: stays active`: zero PayPal calls.
60. `deadline with Maya unpaid enters grace`: Maya payable, others `held`, zero calls.
61. `grace end releases three`: three voids with `fb-void-{authId}`, three `released`, Maya `expired`, `direction = release`, and a reason that mentions Maya and "nobody was charged".
62. `second resolve sends nothing`: 409 `contract_closed`. The void count stays 3.
63. `everyone held keeps`: four captures (`final_capture: true`), four `kept` with capture ids, `direction = keep`, zero voids.
64. `fourth authorize keeps`: the authorize response returns the share and contract both `kept`.
65. `grace payment keeps`.
66. `capture timeout pauses`: `capture_unknown`, `blocked`, and no third capture. The next resolve → 409 `money_unknown`, with zero calls.
67. `blocked keep resumes after sync`: GET authorization `CREATED` → `held`; resolve finishes `kept`; the direction is unchanged.
68. `void timeout pauses and resumes`: `void_unknown` → sync `VOIDED` → resolve → `released`.
69. `void replay`: a 422, then GET `VOIDED` → `released`, with no second void.
70. `capture refused`: `capture_failed`, `blocked`, and resolve → 409 `capture_refused`.
71. `sample contracts resolve locally`: cabin at grace end → `released`; print run → `kept`; fetch is never called.
72. `backward clock after a hold is rejected`: 409 `bad_clock`.
73. `checkout after grace is refused for others`: 409 `share_not_payable`.
74. `authorize after decision is refused`: 409 `contract_closed`, and fetch is not called.
75. `concurrent resolve`: two parallel resolve requests → exactly four capture calls in total. One request gets `409 resolve_in_progress`.

## Phase 8: `test/integration/agent.test.ts`

76. `simulate does not move money`: the preview says `voids: 3`. The database is unchanged and fetch is not called.
77. `simulate matches resolve`: the simulated and real per-person statuses are identical for the same state and time.
78. `reminder rejects an unpayable person`, and Maya's draft contains her pay URL.
79. `proposal is not executed`: `demo_now` is unchanged.
80. `backward proposal is rejected`.
81. `unknown name is not guessed`: an error that lists the valid names.
82. `agent unavailable`: the stub throws → 503 `agent_unavailable`. Board reads still work.
83. `rule text never reaches the agent`: the captured request does not contain `rule_text`.
84. `agent attempts are recorded`: one `ai_usage` row per LLM request in the loop, each with its token counts.

## Limits: `test/integration/limits.test.ts` (phase 4, extended in phase 6)

Each case sets low limits through env.

- L1 `paid model refused at boot`: `LLM_CHAIN=openrouter:openai/gpt-4o` (not free) → the env parser throws.
- L2 `per-user AI limit`: the third create within a minute → 429 `rate_limited` with `Retry-After`. The stub was called twice.
- L3 `daily budget stops calls`: today's attempts are at the call cap → 503 `ai_budget_exhausted`, and the stub is not called. Reads still return 200.
- L4 `reset does not refill the budget`.
- L5 `repeated paste is cached`: the stub is called once, and the second `ai_usage` row has `cached = true` and cost 0.
- L6 `kill switch`: `AI_ENABLED=false` → 503, and health shows `llm: false`.
- L7 `body too large`: 413.
- L8 `checkout limit` (phase 6): the third checkout from one IP → 429, and PayPal is not called.
- L9 `contract caps`: a user over the contract limit → 429.
- L10 `fallback chain`: the Gemini stub returns 429, so Groq `gpt-oss-120b` answers. A timeout there moves to `gpt-oss-20b`, then OpenRouter answers. All fail: extraction returns needs-clarification and the agent returns 503 `agent_unavailable`. Every attempt has an `ai_usage` row.

## Manual negatives (production, before the video)

- Approve the same PayPal return URL twice. The same authorization id comes back.
- Resolve a released sandbox contract twice. The sandbox dashboard shows no new void.
- Open a sample pay link. The hold button is absent.
- Paste the `no-time` text, answer the question, and the plan completes.
- Ask the agent "set Maya's share to $1". It refuses, and nothing changes.
- `curl` 40 create requests in a loop. 429s start at the limit, and the day's AI attempt count stays under the cap.
- `curl -I https://{domain}` shows HSTS and the helmet headers. `https://{domain}/metrics` is not reachable.

## Done

Every automated case passes in CI on the released commit.
