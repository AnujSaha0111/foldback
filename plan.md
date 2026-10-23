# Plan

Hour budget: 40 team-hours. Dates below assume work starts 23 October 2026 and submission is 12 November 2026. If a phase overruns its budget, stop and cut polish, not scope from `product.md`.

Mark a phase done here and in the table in `README.md` only after its exit check passes. Do not start a later phase first, except phase 2 and phase 3, which may run together after phase 1.

| Phase | Budget | Owner | Depends on | Done |
|---|---|---|---|---|
| 0 Spike | 6h | PayPal owner and UI owner | nothing | [ ] |
| 1 Data and seed | 4h | PayPal owner | 0 | [ ] |
| 2 Rule confirm | 5h | Rules owner | 1 | [ ] |
| 3 Scheduler | 5h | UI owner | 1 | [ ] |
| 4 Capture | 6h | PayPal owner | 3 | [ ] |
| 5 Grace and refund | 6h | Rules owner and PayPal owner | 4 | [ ] |
| 6 Lock when full | 3h | Rules owner | 5 | [ ] |
| 7 Judge pack | 5h | Product owner and UI owner | 6 | [ ] |

Roles, including when one person is doing all of the vibe-coding: still switch hats in this order so PayPal and the schedule are proven before the model is polished.

- Product owner: copy, demo prep, judge README, video.
- UI owner: Vite, three screens, Bryntum.
- PayPal owner: sandbox, SQLite, orders, capture, refund.
- Rules owner: extraction validator, resolve engine, Vitest.

## Phase 0 — Spike

File: `phases/00-spike.md`

Prove two things and stop if either fails:

- A Bryntum Scheduler trial build renders one row in the Vite app.
- A server script creates a sandbox order, a human approves it, the server captures it, and the server refunds that capture. Both ids are printed.

Also send the Bryntum license email in that file and paste the outcome below.

License email sent on: (fill in)

Reply: (fill in: pending, yes through 15 December 2026, or no)

## Phase 1 — Data and seed

File: `phases/01-data-and-seed.md`

SQLite schema from `data-model.md`, seed `cabin-hold` and `print-full`, reset route, invariant tests. No PayPal calls and no model calls.

## Phase 2 — Rule confirm

File: `phases/02-rule-confirm.md`

`POST /api/contracts` and confirm. Stub the model in tests. Rule screen shows clarification or the confirm list.

## Phase 3 — Scheduler

File: `phases/03-scheduler.md`

Board reads `GET /api/contracts/:id/scheduler`. Sample cabin rows render as Held, Waiting, and the deadline marker. Dragging is off. No clock resolve yet.

## Phase 4 — Capture

File: `phases/04-capture.md`

Confirm creates sandbox shares. Checkout redirects to PayPal. Return URL captures. A second checkout for a captured share returns `409 share_already_captured`. Unknown capture stays reserved. The board updates from the server. Do not lock or refund in this phase.

## Phase 5 — Grace and refund

File: `phases/05-grace-and-refund.md`

Demo clock and resolve. Grace rules from `architecture.md`. A failed condition refunds every `captured` sandbox share once. Sample rows return `409 sample_row` and are skipped, not crashed. Unknown refund blocks the contract. If `paid >= headcount`, leave the contract `active` until phase 6. That gap is temporary and is called out in the phase file so nobody "helps" by locking early.

## Phase 6 — Lock when full

File: `phases/06-lock-when-full.md`

Resolve locks when `paid >= headcount`. Capture of the share that crosses the headcount runs resolve. Refunds after lock return `409 contract_locked`. The print-run sample contract locks locally without PayPal ids.

## Phase 7 — Judge pack

File: `phases/07-judge-pack.md`

Feature freeze. `app/README.md`, `app/LICENSE` (MIT), `.env.example` checked, video shot from `demo.md`, Devpost text drafted in `demo.md`. No new routes.

## Stop rules

- Phase 0 cannot capture or cannot refund: stop. Do not fake the ids.
- Phase 0 Scheduler package will not install under the trial terms: stop. Do not draw a substitute calendar and keep the Bryntum prize claim.
- A later phase needs a schema change: stop and reconcile `data-model.md`. Do not migrate ad hoc.
- The model returns prices that the validator did not overwrite: stop and fix the validator. Do not trust the model because a demo looked right.
- Wall time is past 10 November 2026 and phase 5 is not done: skip new visual ideas, finish refund and lock, then the judge pack.

## Definition of the build being finished

A new machine with Node 20, a PayPal sandbox app, and a Bryntum trial install can follow `app/README.md` to open the sample board, confirm a pasted rule, capture one share, lock the print-run path, and refund a short sandbox contract. `npm test` from `app/` passes the cases in `test.md`.
