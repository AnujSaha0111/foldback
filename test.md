# Tests

Run from `app/` after phase 1 exists:

```bash
npm test
```

Vitest. Server tests mock `fetch`. They do not call PayPal or the model. A case belongs to the phase that names it. Do not add cases that are not listed here unless a bugfix needs one assertion on a route that already exists. Do not add a new behavior to have something to test.

Shared fixtures live in `app/shared/src/rules.ts` and `app/server/test/fixtures/rules.ts`.

## Separating failures

- Extraction tests stub the model. A failure there is a validator or schema bug, not a PayPal bug.
- Resolve tests stub the PayPal client and count calls. A wrong status with the expected call count is an engine bug.
- A PayPal call count that is wrong is an idempotency bug.
- Manual sandbox failures are recorded in the phase exit note with the HTTP status and the PayPal `name` field, and are not "fixed" by changing the engine to ignore them.

## Phase 1

File: `app/server/test/seed.test.ts`

1. `reset yields two seeds` — after `resetDemo()`, seed keys are `cabin-hold` and `print-full` only.
2. `cabin names and grace` — shares are Alex Chen, Sam Ortiz, Jordan Lee, and Maya Shah. Only Maya has `is_grace_subject = 1`. Amounts are 8000. Headcount is 4. Deadline is `2026-11-06T18:00:00-08:00`. Grace end is `2026-11-09T18:00:00-08:00`. `demo_now` is `2026-11-06T16:00:00-08:00`.
3. `sample rows have no paypal ids` — every seeded share has `money_source = sample`, a non-empty `sample_label`, and null order, capture, and refund ids.
4. `print run is full and past deadline` — four captured shares, `demo_now` is `2026-11-06T18:05:00-08:00`, grace columns null.
5. `held count ignores nothing yet` — cabin summary `held_count` is 3. Print-run `held_count` is 4.
6. `second reset does not duplicate` — two resets still leave two contracts.

## Phase 2

File: `app/server/test/extract.test.ts`

Use the stub JSON, not a live model.

7. `cabin extraction is complete` — stub returns title `Cabin`, currency `USD`, total 32000, share 8000, headcount 4, the cabin deadline and grace timestamps, timezone `America/Los_Angeles`, people Alex Chen, Sam Ortiz, Jordan Lee, Maya Shah, grace person Maya Shah, `missing` empty. HTTP 200 and status `awaiting_confirmation`.
8. `confirm inserts sandbox shares` — confirm creates four `waiting` shares at 8000 cents, `money_source = sandbox`, `demo_now` two hours before the deadline, contract `active`.
9. `no-date asks` — input "We need 4 people at $80 each by Friday evening. The people are Alex Chen, Sam Ortiz, Jordan Lee, and Maya Shah." Stub omits a timestamp. Response 422 `needs_clarification` and `missing` contains `deadline_at`. No shares.
10. `bad math asks` — text states $320 total and $50 shares for 4 people. Validator clears both money fields. 422. `missing` contains `total_cents` and `share_cents`.
11. `two grace people ask` — "Maya Shah or Noah Brooks can pay Monday." Grace fields null, `missing` contains `grace_person_name`.
12. `headcount 6 asks` — `missing` contains `headcount`. No shares.
13. `tampered confirm is rejected` — stored extraction share is 8000, body sends 100. 422 `confirm_mismatch`. Status stays `awaiting_confirmation`.
14. `bad evidence quote is dropped` — quote `not in the text` is removed. Extraction can still confirm if the other fields are complete.
15. `people count must match headcount` — three names and headcount 4 adds `people` to `missing`.

## Phase 3

File: `app/server/test/scheduler.test.ts`

16. `cabin event names` — Alex, Sam, and Jordan events are named `Held`. Maya is `Waiting`.
17. `markers` — payload includes the deadline and grace end.
18. `print run held` — four events named `Held`.
19. `sample flag is present` — each event `moneySource` is `sample`.

## Phase 4

File: `app/server/test/capture.test.ts`

Mock PayPal HTTP.

20. `sample checkout is refused` — 409 `sample_row`, fetch not called.
21. `checkout stores the order` — share `checkout_open`, order id stored, operation row `completed`.
22. `capture stores the id` — status `captured`, capture id stored, contract still `active` (lock is phase 6).
23. `second checkout is refused` — 409 `share_already_captured`, no second create-order call.
24. `capture timeout reserves the share` — status `capture_unknown`, following checkout is 409 `money_unknown`.
25. `sync completes an unknown capture` — GET order `COMPLETED` with a capture id moves the share to `captured`.
26. `buyer cancel declines` — sync with `buyer_cancelled: true` on an uncaptured order sets `declined`.
27. `live env is rejected` — env parser throws when `PAYPAL_ENV` is `live`.

## Phase 5

File: `app/server/test/resolve.test.ts`

Build contracts with SQL or the confirm helper. Shares that must refund are `sandbox` with fake stored capture ids. The mock refund returns `COMPLETED` and a new refund id unless the test says otherwise.

28. `deadline with maya unpaid enters grace` — 3 captured, Maya `waiting`, `demo_now` equals the deadline. Status `grace`. Maya can still be checked out in the engine's payable check. Alex, Sam, and Jordan stay `captured`. Any extra `waiting` share would be `expired`; do not add a fifth person.
29. `grace end refunds three` — `demo_now` equals `grace_until`. Three refund calls. Three `refunded` ids. Status `unwound`. Reason sentence mentions Maya Shah and refund.
30. `second resolve does not refund again` — call count stays 3. Response 409 `contract_terminal`.
31. `refund timeout blocks` — first refund throws a network error. That share `refund_unknown`, contract `blocked`, no further refund calls in that run. Next resolve calls refund 0 times and returns 409 `money_unknown`.
32. `already refunded replays the id` — PayPal 4xx `CAPTURE_FULLY_REFUNDED` (match on the documented issue name the mock returns) then GET capture shows refund id `rf_existing`. Stored refund id is `rf_existing`. Status `refunded`.
33. `sample unwind does not call paypal` — cabin seed, clock at grace end, fetch not called, ids null, contract `unwound`, sample badge still set.
34. `backward clock after capture is rejected` — 409 `bad_clock`.
35. `full headcount does not lock yet` — 4 captured sandbox shares, resolve leaves status `active` and calls refund 0 times. Phase 6 replaces this test.

## Phase 6

Replace test 35. File remains `resolve.test.ts` plus capture coverage.

35. `full headcount locks` — 4 sandbox captures, `demo_now` before or after the deadline, one resolve. Status `locked`, shares `locked`, refund calls 0, reason sentence says kept. Second resolve returns 409 `contract_locked`.
36. `fourth capture locks` — contract with 3 captured and one `checkout_open`. Capture success returns share status `locked` and contract status `locked`.
37. `print run sample locks without paypal` — resolve on `print-full` does not call fetch. Event names from the scheduler projection are `Kept`. Ids stay null.
38. `grace payment locks` — 3 captured, Maya waiting, status already `grace`, Maya capture succeeds. Contract `locked`. Refund calls 0.
39. `checkout after lock is refused` — 409 `contract_locked`.

## Manual negatives

Do these once before the video. They are not extra automated cases.

- Approve the same return URL twice. The second capture shows the existing capture id and does not create a second order.
- Advance a 3-pay sandbox contract to grace end, then press Resolve again. No new refund id.
- Start checkout on a sample row from the cabin board. The button is absent or the API returns `sample_row` if the button is forced.
- Paste a rule with no date. The confirm button is absent and the question is visible.

## Done

All automated cases above pass in one `npm test` run at the end of phase 6, and again in phase 7.
