# Phase 5 — Grace and refund

Budget: 6 hours. Owners: Rules and PayPal. Depends on phase 4.

## Read

- `architecture.md` resolve rules, except you will not take the lock transition yet
- `paypal.md` refund and sync mapping
- `api.md` Clock and Resolve
- `scheduler.md` buttons
- `test.md` cases marked phase 5
- `demo.md` only for the meaning of the cabin clock, not to record the video

## Goal

Moving the demo clock applies grace or refunds real captures. Sample captures are never sent to PayPal.

## Do not

- Do not set status to `locked` in this phase. If `paid >= headcount`, resolve returns the contract unchanged and writes no `contract_locked` event. The phase 6 file removes this exception.
- Do not refund a share that is `sample`. Skip it, append an event `share_expired` or leave it `captured` with the sample label, and include it in `resolution_reason` as "Sample rows were not refunded because they have no PayPal capture." If a contract is entirely sample and the condition fails, set status `unwound` anyway so the print and cabin seeds can show the local outcome, and set each sample `captured` share to `refunded` without ids. The badge remains `Sample — no PayPal capture`. This local sample unwind is only for the board story. The video refund uses sandbox rows.
- Do not add a per-person refund button.
- Do not retry a refund inside a loop after `refund_unknown`.

## Create

```text
app/server/src/engine/resolve.ts
app/server/src/engine/money.ts
app/server/test/resolve.test.ts
```

Mount `POST /api/contracts/:id/clock` and `POST /api/contracts/:id/resolve`.

Show the clock buttons on the board. Helper text matches `ui.md`.

`money.ts` only converts cents to the two-decimal string and checks `total_cents === headcount * share_cents`.

### Behavior to implement now

Using the definitions in `architecture.md`:

- Before the deadline, unpaid shares can still check out. No refunds.
- At the deadline, if `paid + graceSlot >= needed` and `paid < needed`, status `grace`. Only the grace subject can check out. Other `waiting` shares become `expired`.
- At the deadline, if `paid + graceSlot < needed`, unwind.
- At `grace_until`, if still `paid < needed`, unwind.
- Unwind of sandbox `captured` shares calls the refund endpoint once per share with the stable idempotency key.
- Timeout or unreadable refund: that share `refund_unknown`, contract `blocked`, stop the loop.
- `409 money_unknown` on resolve while any share is unknown.
- Clock cannot move backward after a sandbox capture (`409 bad_clock`).

`resolution_reason` is a single sentence the engine builds from counts. Example: `3 of 4 were captured when Maya Shah's grace ended, so Foldback refunded every captured share.`

## Exit check

Tests with a mocked PayPal client:

- Cabin shape with 3 sandbox captures and Maya waiting, clock set to the deadline: status `grace`, Maya still payable, others waiting become `expired`.
- Same contract, clock set to `grace_until`: three refund calls, three `refunded` shares, status `unwound`, one reason sentence.
- Resolve again: zero additional refund calls, `409` is not required on the terminal contract; return the unwound contract on GET, and a further resolve returns `409 contract_terminal`.
- Refund timeout: one refund unknown, contract `blocked`, second resolve does not call refund.
- Already-refunded PayPal error path stores the existing refund id via the GET mapping and does not create a second local refund id.
- Sample cabin seed, clock at grace end: local status `unwound`, PayPal client not called, ids still null.

Manual: prepare three real captures on one confirmed contract (names do not need to match the seed), advance to grace end, and read three refund ids in the panel. If prep time runs out, the mocked tests plus one live refund of a single captured share are the minimum. Say which one you did.

## Exit note

Live refund ids, or "mock only":
