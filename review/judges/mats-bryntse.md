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

_Pending._

## Independent Evaluation by Ravi

_Pending._

## Consolidated Observations

[To be completed after all three reviews are available.]
