# Mats Bryntse — PayPal Judge Evaluation

Judge profile:
CEO, Bryntum.

## Independent Evaluation by Nishit

Evaluated on 5 November 2026 from the board code (`frontend/src/features/board/`), the Bryntum configuration, the deployed board, and the product as a whole.

**1. Role and perspective.** CEO of Bryntum. The lens: vision, innovation, originality, execution, business potential, differentiation, market relevance, usability, scalability, overall value. And specifically, how well the Bryntum Scheduler is used.

**2. Overall impression.** The Scheduler is used for something it is rarely used for: a deadline-driven money state rather than staff or resources. One row per person carries a bar whose label is the share's status word. Time ranges mark Now, the Deadline and the end of Grace. A dashed marker shows a clock move the AI proposed but nobody has approved. A Pay link column has Copy and Open buttons, and clicking a row opens the person's hold in a popup. Updates arrive live over sockets. It is a clean, purposeful use, but a read-only one.

**3. Strongest aspects.**
- A meaningful timeline. The deadline and grace are the product's core concepts, and the Scheduler shows them as they are.
- Status as text on the bars, never colour alone. Short bars move their label outside, so nothing is clipped.
- Integration discipline:
  - Bryntum loads only on the board route through `next/dynamic` with `ssr: false`, behind a fixed-height placeholder.
  - Its CSS is imported only there.
  - Its theme variables are mapped to the app's tokens.
- The AI and the Scheduler meet: a proposed clock move is drawn as a dashed line before approval.

**4. Weaknesses.**
- Read-only. Nothing is dragged, resized or edited on the timeline, so the interaction model of a scheduler is barely used.
- On a phone the Person and Pay link columns take most of the width (FE-051).
- The `FoldbackScheduler` component itself has no unit tests (FE-080).
- It runs on the 7.3.7 trial build. The key must be renewed before 1 December for judging.

**5. Technical concerns.** The projection comes from the server (`/scheduler` read model), which is the right design. Event density per row is low, so performance is not a concern at this scale.

**6. Product and UX concerns.**
- The demo clock is driven by buttons above the chart. The chart's own Now line could be the control.
- The keyboard path exists through "Show a person", but in-grid button focus is unverified (FE-040).

**7. Questions this judge might reasonably ask.**
- Why a scheduler and not a simple list?
- What Bryntum features did you consider and reject?
- Would organizers drag a deadline?
- How does it look with 20 people?

**8. Reasons it could lose points.** For a Bryntum-focused judgement, a read-only chart with buttons beside it uses a small part of what the component offers.

**9. Improvements that would increase competitiveness.**
- J-NISHIT-014: let the organizer drag the Now line (demo clock) or the Deadline marker on the chart. On drop, show the same confirm as the buttons and move it through the existing clock route; the server stays the authority. One interaction that only a scheduler gives.
- J-NISHIT-015: under 600 px, hide the Pay link column and narrow Person (FE-051).
- J-NISHIT-010 (shared): renew the trial key before 1 December, and check the board on the deployed site that day.

**10. Score (shared rubric).**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 4 | A careful, isolated Bryntum integration with live updates, server projections and token-mapped theming. |
| Design | 4 | Status-labelled bars, clear markers and the proposal line read well; no interaction on the timeline itself. |
| Potential Impact | 3 | A new domain for a scheduler; the product's market is still to prove. |
| Innovation/Idea | 4 | Showing money commitments against a deadline on a scheduler, with AI proposals drawn on it, is original. |
| Presentation | 2 | The board is not yet shown in a video or README. |

Average: 3.4.

**11. Most important changes.** J-NISHIT-010 (the trial key and a live check before judging), J-NISHIT-014 (one drag interaction), then J-NISHIT-015.

## Independent Evaluation by Manveer

Evaluated on 10 November 2026 from the deployed board (the Cabin weekend sample plan in an 800 px-wide browser pane), the backend projection that feeds it (`backend/src/domain/projection.ts`, `GET /api/contracts/:id/scheduler`), the rest of the live app, and the backend as a whole.

**1. Role and perspective.** CEO of Bryntum. The lens: product vision, innovation, originality, technical execution, business potential, differentiation, market relevance, quality of execution, usability, scalability and overall product value, plus how well the Bryntum Scheduler is used.

**2. Overall impression.** An original product idea with a clear use for a scheduler: each person is a row, each bar is that person's money status across the deadline, and markers show Now, the Deadline and the end of Grace. The backend computes the rows, bars and markers itself, so the board shows exactly what the server decided and cannot drift from the rule. On the deployed site the board loaded after a short "Loading the board…" state and rendered cleanly; at 800 px the timeline needs horizontal scrolling. The Scheduler is used read-only.

**3. Strongest aspects.**
- A purposeful mapping: time is the axis the product is about (deadline, grace), and every bar carries its status word.
- Server-side projection: one endpoint returns resources, events and time ranges, and unclear money states come back as red bars ("Capture unknown", "Release unknown"), so the board shows the project's most distinctive safety state.
- Live updates over sockets, and the heavy Scheduler chunk is loaded only on the board route (FE-062).

**4. Weaknesses and shortcomings.**
- Read-only: nothing on the timeline can be dragged or edited (J-NISHIT-014 proposes one interaction).
- Four rows and one plan at a time use little of the Scheduler's strength with many resources and long ranges.
- The trial license must stay valid through 15 December (J-NISHIT-010).
- Narrow widths are cramped (FE-051).

**5. Technical implementation concerns.** The board is only as live as production: a deploy during judging that stops a wave halfway shows red "unknown" bars until someone checks payment (BE-010), and after the rename deploys may stop (BE-021).

**6. Product and user-experience concerns.** The business potential is real (group trips, gifts, bulk orders), but groups stop at 4 and money goes to a sandbox merchant account.

**7. Questions this judge might reasonably ask.**
- Why a scheduler for a 4-row view, and what would it look like with 50 people or 20 plans?
- What would the organizer do on the timeline if it were editable?
- How does the board behave on a phone?

**8. Potential reasons the project could lose points.** For "Best Use of Bryntum", a clean but read-only, four-row use may look modest next to entries that use editing, dependencies or large data sets.

**9. Specific improvements that would increase competitiveness.**
- J-NISHIT-014: one drag interaction (the Now line) that goes through the existing clock route and its confirmation.
- J-MANVEER-009: show the paused state on the board in the video: a red "Capture unknown" bar, Check payment, then green "Kept". It is the moment where the Scheduler shows something no spreadsheet would.
- As "what's next": an organizer view with one row per plan across weeks, which plays to the Scheduler's strength with many resources.
- J-NISHIT-010: renew the trial key and check the deployed board on 1 December.

**10. Score (shared rubric).**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 4 | A server-driven projection into the Scheduler with live updates, on top of a careful money backend; the Scheduler itself is used read-only. |
| Design | 4 | A clear, status-labelled timeline with Now, Deadline and Grace markers; cramped at narrow widths. |
| Potential Impact | 3 | A broad set of group-purchase uses, limited today by group size and sandbox only. |
| Innovation/Idea | 4 | Using a scheduler to show money held against a deadline is an original application. |
| Presentation | 3 | The landing page and board present the idea well; the README and video are not ready. |

Average: 3.6.

**11. The most important changes to prioritize.** Keep the board alive and current through judging (J-NISHIT-010, J-MANVEER-002), add one timeline interaction (J-NISHIT-014), and show the paused-to-kept moment in the video (J-MANVEER-009).

## Independent Evaluation by Ravi

_Pending._

## Consolidated Observations

[To be completed after all three reviews are available.]
