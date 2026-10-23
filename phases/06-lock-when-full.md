# Phase 6 — Lock when full

Budget: 3 hours. Owner: Rules owner. Depends on phase 5.

## Read

- `architecture.md` lock transition
- `api.md` error `contract_locked`
- `test.md` cases marked phase 6
- `product.md` two outcomes

## Goal

When the number of captured shares reaches the headcount, the contract becomes `locked`, those shares become `locked`, and later refunds do not run. The board shows `Kept`.

## Do not

- Do not add a new table.
- Do not let the model write the lock sentence.
- Do not keep the phase 5 exception that ignored a full headcount.

## Change

In `engine/resolve.ts`, delete the temporary branch that left a full contract `active`.

When `paid >= needed`:

- Contract status `locked`
- Each `captured` share becomes `locked`
- `resolved_at` set from wall clock
- Event `contract_locked`
- `resolution_reason`: `{paid} of {needed} were captured by the deadline, so Foldback kept every share.`
- During grace, the same lock runs if the grace person pays and `paid >= needed` before `grace_until`

Call `resolve` at the end of a successful capture so the share that completes the headcount returns from the capture route with contract status `locked` and share status `locked`.

Refund code paths must no-op with `409 contract_locked` if invoked while locked. Resolve on a locked contract returns `409 contract_locked`.

Print-run sample: `demo_now` is already past the deadline and four sample shares are `captured`. Resolve sets them `locked` locally, does not call PayPal, and the badge stays sample. Event names become `Kept`.

Checkout and capture against a locked contract return `409 contract_locked`.

## Exit check

- Test: 4 sandbox captures before the deadline, resolve once, status `locked`, refund client called 0 times, second resolve is `409 contract_locked`.
- Test: 3 captures plus the fourth capture request, and the capture response's contract is `locked`.
- Test: print-run sample resolve does not call PayPal and events are `Kept`.
- Test: grace person pays during grace and the contract locks instead of unwinding.
- Browser: print-run board after Resolve shows four `Kept` labels and the reason sentence.

## Exit note

Tests:
