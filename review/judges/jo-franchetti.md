# Jo Franchetti — PayPal Judge Evaluation

Judge profile:
Developer Advocate, PayPal.

## Independent Evaluation by Nishit

Evaluated on 5 November 2026 from the code on `main` plus `review-nishit`, the spec in `docs/spec/`, and the deployed app at https://app.foldback.tech. The README judge guide and the video do not exist yet, so the Presentation score reflects today, not the planned submission.

**1. Role and perspective.** Developer Advocate at PayPal. The lens: can a developer understand what this does with PayPal, see how, and learn from it? How clearly does the project communicate, and how well does it show its own capabilities?

**2. Overall impression.** Foldback uses a part of PayPal most developers never touch: Orders v2 with `intent: AUTHORIZE`, then capture or void. It uses it for a real reason: hold everyone's share, and only charge if the whole group commits. The engineering behind it is careful. The story is not told yet: the README is nine lines, and a developer opening the repo learns almost nothing about the PayPal calls without reading `docs/spec/paypal.md`.

**3. Strongest aspects.**
- A clear, teachable PayPal pattern: one order and one authorization per friend. Capture all or void all. A per-object idempotency key on every call (`fb-order-…`, `fb-auth-…`, `fb-capture-…`, `fb-void-…`).
- Honest handling of "we do not know": a lost PayPal reply becomes an "unknown" status that pauses the plan. The app asks PayPal again rather than guessing.
- The product demos itself: guest mode, sample plans, and a demo clock that jumps to the deadline or the grace end, so the whole capture or release story fits in a minute.
- The AI is visible and bounded. The assistant shows which tools it used, and its proposals wait for approval.

**4. Weaknesses.**
- No developer-facing guide yet: no README walkthrough, no "the PayPal calls we make" table at the top, no diagram.
- The spec is thorough but long, written for the team rather than for a visitor.
- Where the captured money goes (the app's sandbox merchant account, not the organizer) is not explained anywhere a visitor would look.

**5. Technical concerns.**
- The authorization window: PayPal authorizations last up to 29 days and are only guaranteed for 3. The validator enforces 29 days, but the UI never explains why a deadline cannot be further out.
- Socket.IO with polling and RTK Query is a reasonable stack, but there is no API reference (OpenAPI or a table) for someone who wants to build on it.

**6. Product and UX concerns.**
- The first screen after sign-in asks for a pasted chat. The sample chat link helps, but a developer may not realise the AI is the entry point.
- The board's Resolve button does not say what it will do (FE-032).

**7. Questions this judge might reasonably ask.**
- Why authorize-then-capture instead of PayPal's vaulting or a payouts flow?
- What happens if PayPal's reply to a capture is lost?
- How would a real organizer receive the money?
- Which parts would another developer reuse?

**8. Reasons it could lose points.** The project's best material (the PayPal state machine and the unknown-result handling) is buried in spec files. A thin README or a video that only shows screens would hide it.

**9. Improvements that would increase competitiveness.**
- J-NISHIT-001: turn the README into the judge guide. One paragraph on the idea, the live link, a two-minute tour, a table of the four PayPal calls with their idempotency keys, a small architecture diagram, and how to run it.
- J-NISHIT-002: in the video, show one hold, then the demo clock moving past the deadline, then the capture, then the release case. Name the PayPal call on screen at each step.
- J-NISHIT-003: one sentence everywhere money is mentioned: "Sandbox only. Captured shares go to Foldback's sandbox merchant account; paying the organizer directly is next (PayPal multiparty)."

**10. Score (shared rubric).**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 4 | Orders v2 authorize, capture and void with idempotency keys and an operation log written before each call; deployed and tested. |
| Design | 4 | A consistent, square, readable design system with live status everywhere; the board's Resolve lacks a preview. |
| Potential Impact | 3 | A real pain (the organizer fronting money), but sandbox-only with no payout to the organizer yet. |
| Innovation/Idea | 4 | Using authorization holds as an all-or-nothing group commitment, set up from a chat by AI, is uncommon and fits PayPal well. |
| Presentation | 2 | Today the README is a stub and there is no video; the live demo is good but unexplained. |

Average: 3.4.

**11. Most important changes.** J-NISHIT-001 (README judge guide), then J-NISHIT-002 (a video that names the PayPal calls), then J-NISHIT-003.

## Independent Evaluation by Manveer

_Pending._

## Independent Evaluation by Ravi

_Pending._

## Consolidated Observations

[To be completed after all three reviews are available.]
