# Phase 7 — Resolve: keep or release

Budget: 8 hours. Hats: Rules and PayPal. Depends on phase 6. Dates: 6–7 November 2026.

## Read

- `architecture.md`: Money state machine, Direction, Resolve rules, Payable rule, Concurrency
- `paypal.md`: capture, void, sync mapping
- `api.md`: Clock, Resolve
- `scheduler.md`: Operator controls
- `test.md`: phase 7 cases

## Goal

The demo clock, the Resolve button, or the last authorize applies the rule:

- everyone held → every hold captured (`kept`)
- short with grace → `grace`
- otherwise → every hold voided (`released`)

Unknown outcomes pause the contract. Nothing is ever sent twice, even with concurrent requests. Sample contracts resolve locally.

## Create

```text
backend/src/domain/{decide,reason}.ts           pure, unit-tested exhaustively
backend/src/services/resolve.service.ts         under withContractLock
backend/test/unit/decide.test.ts
backend/test/integration/resolve.test.ts
frontend: clock buttons, Resolve, Paused banner + Check payment, reason live region
```

Extend the PayPal client with `captureAuthorization` and `voidAuthorization`, and `sync.service` with the capture and void rows. Replace the phase 6 marker with the locked resolve call. Mount clock and resolve.

The reason sentences are in `domain/reason.ts`. Use the texts listed in `ai.md` and `architecture.md`, and never let the model write them.

## Do not

- Retry a capture or void in a loop after an unknown.
- Flip `direction` once it is set (the trigger will refuse anyway).
- Add per-person capture or void buttons.

## Exit check

- [ ] Phase 7 cases pass, including the concurrency case. CI is green and deployed.
- [ ] Second review pass done on `decide`, `resolve.service`, and `sync.service` (money code).
- [ ] Manual on production, release: a cabin with three real holds, advance to grace end, three Released, and `VOIDED` shown in the sandbox dashboard.
- [ ] Manual on production, keep: a print run with three holds, then the fourth on a phone, and all four Kept with capture ids in the same request.
- [ ] Resolve again on both: no new PayPal activity.
- [ ] `learn/09-resolve.md` is written.

## Exit note

Released authorization ids:

Kept capture ids:
