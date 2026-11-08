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

Evaluated on 8 November 2026 from `main` at `196f4f9`, the spec in `docs/spec/`, the AI and misc reviews in `review/ai/` and `review/misc/`, and the live app at https://app.foldback.tech. Live: I tried it as a guest, opened the Cabin weekend sample board, asked the assistant two questions ("What happens if Maya Shah doesn't pay?" and "Move to the deadline"), and opened Maya's pay link on a phone-sized screen. I read the hold, resolve and sync code paths and ran the test suites (500 backend tests against a throwaway database, 215 frontend tests, all passing). The README judge guide and the video do not exist yet, so Presentation reflects today, not the planned submission.

**1. Role and perspective.** CEO of Bryntum. The lens: product vision, innovation, originality, execution quality, business potential, market relevance and usability, and specifically how well the Bryntum Scheduler is used.

**2. Overall impression.** A distinctive idea executed with care, and a sensible, restrained use of the Bryntum Scheduler: one row per person across the plan's days, status bars, and Now, Deadline and Grace markers, updated live. The scheduler is used as a read-only status timeline rather than an editing tool, which suits the product but shows only a small part of what Bryntum can do.

**3. Strongest aspects.**
- Authorization holds used for what they are for: one order and one authorization per friend, captured all together or voided all together, each call with its own idempotency key (`fb-order-…`, `fb-auth-…`, `fb-capture-…`, `fb-void-…`).
- Money calls are written down before they are sent and settled after, so a lost PayPal reply becomes an explicit "unknown" that pauses the plan until a sync, instead of a guess.
- The AI is bounded by code: the server validator can only clear fields, prices need a quoted dollar figure, and the assistant's five tools only read, simulate or propose. In my live test, the clock move stayed a proposal with Approve and Dismiss.
- The Bryntum board carries the product's key idea visually: who is in, the deadline in orange, the grace window, and the demo clock's "Now" line moving when it advances.
- Live updates over Socket.IO with a polling fallback (FE-011) make the board feel alive when a friend pays on their phone.

**4. Weaknesses and shortcomings.**
- Bryntum is used read-only, with drag, resize and create disabled by design, so the integration does not show interaction.
- The board is the heaviest route; the Bryntum chunk stays on it (FE-062), and no performance numbers exist yet (MI-016).
- The licence situation (trial package under an MIT repo) is not stated (MI-031).

**5. Technical implementation concerns.**
- Hour ticks across a seven-day view are dense on a laptop screen; zoom presets per plan length would help.

**6. Product and user-experience concerns.**
- The "Proposed" marker for an assistant's pending clock move (described in the spec) is a good place to show the scheduler responding to the AI; I did not see it in my live run.

**7. Questions this judge might reasonably ask.**
- Why use a scheduler for this rather than a simple table?
- Which Bryntum features did you try and leave out, and why?
- How does the board behave with many plans or longer deadlines?

**8. Potential reasons the project could lose points.** If the video shows the board only as a static picture, its value over a plain list is not visible.

**9. Specific improvements that would increase competitiveness.**
- J-RAVI-008: in the video, show the board updating live as a friend holds on a phone, the Now line jumping to the deadline, and the dashed Proposed marker appearing when the assistant proposes a move.
- State the Bryntum licence in the README (MI-031) and the reasoning for read-only use (it is a display of server truth, so editing would bypass the rules).

**10. Score (shared rubric).**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 4 | Solid execution, including a well-configured Bryntum timeline with live updates; the scheduler's interactive features are deliberately unused. |
| Design | 4 | Consistent, readable design with status words everywhere and a calm pay page that puts "This is a hold, not a charge." above the fold on a phone; small gaps such as the default 404 page and the assistant's "prop_1" (MI-013, AI-010). |
| Potential Impact | 3 | A real pain (the organizer fronting money), but sandbox only, capped at four payers, and captured money goes to Foldback's sandbox merchant rather than the organizer. |
| Innovation/Idea | 4 | All-or-nothing group commitment through PayPal authorization holds, set up from a pasted chat with quoted evidence, is uncommon and fits PayPal's own primitives. |
| Presentation | 2 | The README is nine lines and still names the hackathon (MI-025), there is no video yet, and the live app has no social preview card (MI-011). |

Average: 3.4.

**11. Most important changes to prioritise.** J-RAVI-008 (show the live board and the Proposed marker in the video), then the README Bryntum note.

## Consolidated Observations

[To be completed after all three reviews are available.]
