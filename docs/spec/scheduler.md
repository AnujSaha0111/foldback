# Bryntum Scheduler

Bryntum is the organizer's board. It shows one row per person across the deadline, and it updates the moment a hold, capture, or release happens, or when the agent proposes a clock move. It never decides money.

We target **Best Use of Bryntum**. The prize brief explicitly rewards "an agent that drives the schedule itself." The board must visibly react to the agent's proposals and to PayPal outcomes, not just render once.

## Package

```bash
yarn add @bryntum/scheduler@npm:@bryntum/scheduler-trial @bryntum/scheduler-react
```

The hackathon page gives the alias as `npm install @bryntum/scheduler@npm:@bryntum/scheduler-trial`. Yarn supports the same `npm:` alias. Follow the React quick start at `https://bryntum.com/products/scheduler/docs/guide/Scheduler/quick-start/react`. If the React wrapper also needs a trial alias, or the trial needs Bryntum's npm registry login, phase 0 records the exact working command at the top of `FoldbackScheduler.tsx` and in the README. The frontend Dockerfile and CI use the same command. If registry auth is required, the token is a GitHub Actions secret passed as a build secret (`--mount=type=secret`) into the Docker build and read by `.npmrc`. It is never committed or baked into an image layer.

Next.js: `FoldbackScheduler` is a client component loaded with `next/dynamic(() => import(...), { ssr: false })`, because Bryntum needs `window`. Import Bryntum's CSS from that component. Check that the wrapper supports React 19.2 in phase 0. If it does not, stop and ask on the PayPal Discord before considering a React downgrade.

One standard Scheduler. Not Scheduler Pro, Gantt, or Calendar.

## License gate

The trial lasts 45 days. Started 28 October 2026, it ends around 12 December 2026, before judging ends on 15 December 2026.

Phase 0 sends the email in `phases/00-spike.md`, or posts the same request in the PayPal Discord, where Bryntum staff answer hackathon questions. Record the date and the answer in `plan.md`. Never commit a license key or vendor the package. `.gitignore` includes `node_modules`.

If the reply is no or still missing at phase 7, the video is the judging artifact, and the README says a fresh trial install is the run path. Do not switch to a hand-rolled calendar. A hand-rolled calendar fails the sponsor requirement.

## Data

`FoldbackScheduler` loads `GET /api/contracts/:id/scheduler` and passes `resources`, `events`, and `timeRanges` through. It never derives status from colors or from the clock.

The projection is an RTK Query endpoint tagged `Scheduler`. It refetches when a mutation the board triggers invalidates the tag, and when a `contract:changed` socket event arrives, so a friend paying on their phone flips the row to Held within a second, with no polling. If the socket disconnects, the client falls back to refetching every 10 seconds until it reconnects.

## Config

- `readOnly: true`, `eventEditFeature: false`, `eventDragFeature: false`, `eventResizeFeature: false`, `eventDragCreateFeature: false`, `createEventOnDblClick: false`, `zoomOnMouseWheel: false`
- `timeRangesFeature: true`, for markers
- `eventTooltipFeature` with a template that prints the status word and, for sandbox rows, the PayPal id (authorization or capture)
- `startDate` / `endDate` from the API's `start` and `end`
- View preset: day header on top, 6-hour ticks below, sized so the whole window fits about 900 px of board width at a 1280 px viewport, with no horizontal scroll. Phase 3 picks the preset from the Bryntum docs and records it here.
- Resource column header `Person`, width 160. A second narrow column shows the badge `Sample` or `Sandbox`.
- `eventRenderer` prints the event `name`. Never color alone.
- Row height large enough to read event names in the 1280 px video (about 48 px).

Selecting an event or a row calls the parent with `shareId`. The parent shows the detail panel. Selection never moves money.

## Projection (`backend/src/services/projection.service.ts`)

```json
{
  "timezone": "America/Los_Angeles",
  "start": "2026-11-06T08:00:00-08:00",
  "end": "2026-11-11T20:00:00-08:00",
  "resources": [{ "id": "shr_…", "name": "Alex Chen", "badge": "Sample" }],
  "events": [
    { "id": "shr_…:state", "resourceId": "shr_…", "name": "Held", "status": "held",
      "startDate": "…", "endDate": "…", "eventColor": "orange", "moneySource": "sample",
      "paypalId": null }
  ],
  "timeRanges": [
    { "id": "deadline", "name": "Deadline", "startDate": "2026-11-06T18:00:00-08:00", "cls": "fb-deadline" },
    { "id": "grace", "name": "Grace ends", "startDate": "2026-11-09T18:00:00-08:00", "cls": "fb-grace" },
    { "id": "now", "name": "Now", "startDate": "2026-11-06T16:00:00-08:00", "cls": "fb-now" }
  ]
}
```

Window:

- `start`: the calendar day of `deadline_at`, 08:00 in the contract timezone.
- `end`: two days after `grace_until`, or after `deadline_at` when there is no grace, at 20:00.

Use luxon, server-side only. For the cabin seed: `start` `2026-11-06T08:00:00-08:00`, `end` `2026-11-11T20:00:00-08:00`. Tests assert the emitted strings.

The client adds one more time range when the agent panel holds a pending `move_clock` proposal: `{ id: "proposed", name: "Proposed", startDate: proposal.demo_now, cls: "fb-proposed" }`, drawn dashed. It disappears when the proposal is approved or dismissed. This is the only thing the client adds to the projection.

## Event spans

One event per share. `D` = `deadline_at`, `G` = `grace_until`, `S` / `E` = window start / end.

| Share status | `name` | Start | End | Color |
|---|---|---|---|---|
| `waiting` | Waiting | S | D, or G if this is the grace subject and the contract is `grace` | gray |
| `checkout_open` | Paying… | same as waiting | same | gray |
| `declined` | Checkout closed | same as waiting | same | gray |
| `authorize_unknown` | Hold unknown | D − 2h | D + 2h | red |
| `held` | Held | S | D, or G when the contract is `grace` | orange |
| `capture_unknown` | Capture unknown | D | D + 6h | red |
| `kept` | Kept | D − 1h | E | green |
| `capture_failed` | Capture refused | D | E | red |
| `void_unknown` | Release unknown | G or D | + 6h | red |
| `released` | Released | G or D | E | blue |
| `expired` | Missed deadline | D | D + 4h | gray |

Times are clamped to `[S, E]`.

## Sample versus sandbox

`moneySource = sample` keeps the names above. The resource badge column says `Sample`, and the detail panel shows `Sample — no PayPal hold`. Sandbox rows show `Sandbox`, and the tooltip and detail panel show the authorization id, the capture id once kept, and `VOIDED` once released.

## Operator controls (React buttons beside the scheduler, not Bryntum features)

- Advance to deadline: sets `demo_now` to `deadline_at`
- Advance to grace end: sets `demo_now` to `grace_until`, disabled without grace
- Resolve now
- Copy pay link for the selected person
- Reset demo data (in the header)

Each calls the API in `api.md`. The agent panel's approved proposals call the same routes.

## Accessibility

Resource names and event names are text. Buttons have visible labels. The `resolution_reason` sentence is an `aria-live="polite"` region that updates after resolve.

## What a weak integration looks like (avoid)

A calendar screenshot that does not change when PayPal completes. The exit checks require that after authorize the row reads `Held` on the next fetch, after the capture wave every row reads `Kept`, after the release wave every held row reads `Released`, and that a pending agent proposal draws the Proposed marker.
