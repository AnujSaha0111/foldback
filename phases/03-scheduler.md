# Phase 3 — Scheduler

Budget: 5 hours. Owner: UI owner. Depends on phase 1. May run beside phase 2.

## Read

- `scheduler.md`
- `ui.md` Board screen, except Pay and clock buttons
- `api.md` Scheduler projection
- `test.md` cases marked phase 3

## Goal

Opening the cabin sample contract shows four people, three `Held` events, Maya `Waiting`, a Deadline marker, and a Grace ends marker. The JSON for that projection is produced by the server.

## Do not

- Do not enable drag, resize, or double-click create.
- Do not compute status in the client.
- Do not mount the clock or resolve routes. Those are phase 5. Hide Advance and Resolve buttons.
- Do not call PayPal.
- Do not replace Bryntum if the trial already worked in phase 0.

## Create

```text
app/server/src/scheduler/project.ts
app/server/test/scheduler.test.ts
app/client/src/screens/BoardScreen.tsx
app/client/src/scheduler/FoldbackScheduler.tsx
```

Register `GET /api/contracts/:id/scheduler`.

`project.ts` builds resources, events, and markers from `scheduler.md`. Use `luxon` on the server for the visible window. Add it as a dependency in this phase.

Selection loads `GET /api/contracts/:id` and shows the detail panel, including `Sample — no PayPal capture` for seed rows.

Delete or stop routing to `SpikeBoard` from phase 0. Keep the spike script.

## Exit check

- The scheduler test asserts cabin event names: Alex, Sam, and Jordan are `Held`, Maya is `Waiting`.
- The test asserts a deadline and a grace end are present in the payload.
- The test asserts print-run events are all `Held`.
- In the browser, the event labels are readable without relying on color.
- Dragging an event does nothing.

## Exit note

Browser URL checked:
