# Bryntum Scheduler

Bryntum is the operator's board. It shows shares across the deadline. It does not decide money.

Package: `npm install @bryntum/scheduler@npm:@bryntum/scheduler-trial` as documented on the hackathon page `https://paypalaihackathon.devpost.com/details/bryntum`. Use the React guide at `https://bryntum.com/products/scheduler/docs/guide/Scheduler/quick-start/react`.

One component, standard Scheduler, not Scheduler Pro, Gantt, or Calendar.

## License gate

The public offer is a 45-day trial. Judging ends 15 December 2026. A trial started on 23 October 2026 ends before judging finishes.

Phase 0 sends one email to Bryntum, from the address on their hackathon page or the contact in the trial download, asking for trial or license coverage for this team through 15 December 2026, including a judge installing the package from npm to run the demo. Record the reply date and the answer in `plan.md` under Phase 0. Do not commit a license key. Do not vendor the package into git. `.gitignore` must include `node_modules`.

If the reply is no or missing by the end of phase 3, still finish the local demo and the video while the trial works. Phase 7 README tells judges how to install the trial and what to do if the install fails: watch the video. Do not switch to a hand-rolled calendar. A hand-rolled calendar fails the sponsor requirement.

Only people covered by the trial terms open the Bryntum component source. Everyone else can work on the API, engine, and non-scheduler screens.

## Data

`FoldbackScheduler` loads `GET /api/contracts/:id/scheduler` and passes `resources` and `events` through. It does not derive status from colors or from the clock.

Bryntum config:

- `readOnly: true` for event drag, resize, and edit. The organizer does not move a payment by dragging it.
- `eventEditFeature: false`
- `eventDragFeature: false`
- `eventResizeFeature: false`
- `createEventOnDblClick: false`
- `zoomOnMouseWheel: false`
- `viewPreset`: `hourAndDay`
- `startDate` / `endDate` from the API `start` and `end`
- A time-range or a thin marker at `deadline_at` labeled `Deadline`, and at `grace_until` labeled `Grace ends` when grace exists
- A marker at `demo_now` labeled `Now`
- Resource column header: `Person`
- Event renderer prints the event `name`, never color alone

Selecting an event calls the parent with `shareId`. The parent fetches `GET /api/contracts/:id` and shows the detail panel. Selection does not capture or refund.

## Event spans

The API builds one event per share.

| Share status | `name` | Start | End |
|---|---|---|---|
| `waiting` | Waiting | `demo_now` or contract start, whichever is earlier, clamped to the visible window | `deadline_at` |
| `checkout_open` | Checkout open | same as waiting | `deadline_at` |
| `capture_unknown` | Payment unknown | `deadline_at` minus 2 hours | `deadline_at` plus 2 hours |
| `captured` | Held | confirm time or `demo_now` if confirm is unknown; seeds use `demo_now` | `deadline_at` if the contract is `active`, else `grace_until` or `deadline_at` while held |
| `locked` | Kept | `deadline_at` minus 1 hour | `deadline_at` plus 6 hours |
| `refund_pending` | Refund in progress | `deadline_at` | `grace_until` or `deadline_at` plus 6 hours |
| `refund_unknown` | Refund unknown | same as refund in progress | same |
| `refunded` | Refunded | `deadline_at` | end of that span plus 6 hours |
| `expired` | Missed deadline | `deadline_at` | `deadline_at` plus 2 hours |
| `declined` | Checkout closed | `demo_now` | `demo_now` plus 1 hour |

Visible window from the API:

- `start`: the calendar day of the deadline at 08:00 in the contract timezone
- `end`: two days after `grace_until`, or two days after `deadline_at` when there is no grace, at 20:00

For the cabin seed, deadline Friday 6 November 2026 18:00 and grace Monday 9 November 2026 18:00 are both Pacific Standard Time (`-08:00`). `start` is `2026-11-06T08:00:00-08:00`. `end` is two days after grace end, `2026-11-11T20:00:00-08:00`. Phase 3 should assert the ISO strings it emits rather than hand-convert. Use `luxon` inside the server projection only. Do not pull in a second date library on the client.

## Color

Color is secondary to the `name` text. Use Bryntum `eventColor` or `cls`:

| Name | Color token |
|---|---|
| Waiting, Checkout open, Checkout closed, Missed deadline | `gray` |
| Held | `orange` |
| Payment unknown, Refund in progress, Refund unknown | `red` |
| Kept | `green` |
| Refunded | `blue` |

The detail panel repeats the status in text. Do not use color as the only channel.

## Sample versus sandbox

If `moneySource` is `sample`, the event `name` stays as in the table and the detail panel shows the badge `Sample — no PayPal capture`. Do not prefix the event name with "Sample" if it makes the video unreadable; the badge is mandatory in the panel. Sandbox rows show `Capture` and the id, or `Refund` and the id, when those ids exist.

## Operator actions on the board screen

These are normal buttons beside the scheduler, not Bryntum features:

- Advance to deadline (sets `demo_now` to `deadline_at`)
- Advance to grace end (sets `demo_now` to `grace_until`, disabled when grace is null)
- Resolve now
- Open checkout for the selected payable share
- Reset demo data

Each button calls the API in `api.md`. Disable checkout when the selected share is `sample`, not payable, or already captured.

## Accessibility

Resource names and event names are text. Buttons have visible labels, not icon-only controls. The reason sentence from `resolution_reason` is a live region (`aria-live="polite"`) that updates after resolve.

## What a weak integration looks like

A screenshot of a calendar that does not change when capture or refund completes is not enough. After capture, the selected row's event `name` becomes `Held` or `Kept` from the next GET. After unwind, it becomes `Refunded`. Phase 3's exit check is a sample contract. Phase 4 and 5 retest the same component against sandbox statuses.
