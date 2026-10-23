# Foldback

Foldback keeps a group PayPal payment only when a confirmed headcount is reached by the deadline. If the condition fails, the agent refunds every captured share.

This folder is the spec. Application code, when a later session builds it, lives in `app/` and is not part of this spec pass.

Hackathon: [Build What's Next with PayPal and AI](https://paypalaihackathon.devpost.com/). Submission deadline: 12 November 2026, 12:00 Pacific. Judging ends 15 December 2026.

Sponsor tool: Bryntum Scheduler only. PayPal surface: sandbox Orders v2 create, buyer approval, server capture, order retrieval, and capture refund.

## Read order

A coding session reads this file first, then the active phase file, then only the contracts that phase lists.

1. `README.md` (this file)
2. `product.md`
3. `phases/NN-*.md` for the active phase
4. The contract files named inside that phase

Stable contracts:

| File | What it freezes |
|---|---|
| `plan.md` | Phase order, owners, hour budget, stop rules |
| `architecture.md` | Process boundaries and the money state machine |
| `data-model.md` | SQLite tables, statuses, seed contracts |
| `api.md` | HTTP routes the UI is allowed to call |
| `paypal.md` | Sandbox calls, idempotency, unknown outcomes |
| `ai.md` | Extraction schema and confirmation |
| `scheduler.md` | Bryntum resources, events, and license gate |
| `ui.md` | Three screens, copy, demo clock |
| `test.md` | Acceptance cases and negative cases |
| `demo.md` | Seed prep, judge instructions, video |

## Active phase

Start at [phases/00-spike.md](phases/00-spike.md).

Do not open a later phase until the active phase exit check is done and the checkbox in `plan.md` is marked. If a stop rule fires, stop the build and report it. Do not route around a failed spike by swapping libraries.

| Phase | File | Status |
|---|---|---|
| 0 Spike | `phases/00-spike.md` | not started |
| 1 Data and seed | `phases/01-data-and-seed.md` | blocked on 0 |
| 2 Rule confirm | `phases/02-rule-confirm.md` | blocked on 1 |
| 3 Scheduler | `phases/03-scheduler.md` | blocked on 1 |
| 4 Capture | `phases/04-capture.md` | blocked on 3 |
| 5 Grace and refund | `phases/05-grace-and-refund.md` | blocked on 4 |
| 6 Lock when full | `phases/06-lock-when-full.md` | blocked on 5 |
| 7 Judge pack | `phases/07-judge-pack.md` | blocked on 6 |

Phase 3 may start after phase 1. Phase 2 may run in parallel with phase 3 only if both leave the SQLite schema in `data-model.md` untouched. Phase 4 waits for phase 3 because the board has to show a real capture.

## Vibe-coding rules

- Implement the active phase and stop at its exit check.
- Do not add features, tables, routes, screens, or sponsor tools that this spec does not name.
- Do not "improve" the product into a marketplace, escrow service, subscription app, or generic chatbot.
- Server code owns amounts, headcount, deadlines, capture, and refund. The browser and the model do not.
- A row labeled `sample` is not a PayPal payment. Never show a made-up capture id or refund id as verified.
- If a PayPal response is missing or ambiguous, persist `capture_unknown` or `refund_unknown` and stop. Do not create a second order or a second refund to "finish the demo."
- Keep Bryntum package source and trial license keys out of git. Document `npm` install in `app/README.md` during phase 7.
- Original application code is MIT. The license file is added in phase 7 at `app/LICENSE`.
- Tests named in `test.md` are the tests to write. Do not invent extra suites during a phase unless that phase file says to.
- When a contract file and a phase file disagree, the contract file wins. Update neither on the fly; stop and ask.

## Where code goes

```text
newProject/
  README.md          spec entry point
  product.md
  plan.md
  architecture.md
  data-model.md
  api.md
  paypal.md
  ai.md
  scheduler.md
  ui.md
  test.md
  demo.md
  phases/
  app/               created in phase 0, not before
    client/          Vite + React + TypeScript
    server/          Express + SQLite
    shared/          status enums and money types used by both
    data/            sqlite file, gitignored
```

Environment variables, exact routes, and the seed contracts are specified in the contract files. Do not invent a second configuration style.

## One-sentence pitch

Foldback turns a plain-language group condition into a PayPal hold that is either kept when the headcount is met, or folded back to every payer when it is not.
