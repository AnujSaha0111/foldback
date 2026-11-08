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

Evaluated on 8 November 2026 from `main` at `196f4f9`, the spec in `docs/spec/`, the AI and misc reviews in `review/ai/` and `review/misc/`, and the live app at https://app.foldback.tech. Live: I tried it as a guest, opened the Cabin weekend sample board, asked the assistant two questions ("What happens if Maya Shah doesn't pay?" and "Move to the deadline"), and opened Maya's pay link on a phone-sized screen. I read the hold, resolve and sync code paths and ran the test suites (500 backend tests against a throwaway database, 215 frontend tests, all passing). The README judge guide and the video do not exist yet, so Presentation reflects today, not the planned submission.

**1. Role and perspective.** Developer Advocate at PayPal. The lens: can a developer quickly understand what the project does with PayPal and with AI, see how it is built, and learn something reusable? How well does the project explain and show its own capabilities?

**2. Overall impression.** The product shows an unusual and correct use of PayPal Orders v2 with `intent: AUTHORIZE`, and the AI part is honest about its limits. As a teaching artefact it is not there yet: the material that would make a developer say "I could build that" (the PayPal call table, the unknown-result handling, the AI guardrails, the bake-off) is all in long spec files or code, not on the front page.

**3. Strongest aspects.**
- Authorization holds used for what they are for: one order and one authorization per friend, captured all together or voided all together, each call with its own idempotency key (`fb-order-…`, `fb-auth-…`, `fb-capture-…`, `fb-void-…`).
- Money calls are written down before they are sent and settled after, so a lost PayPal reply becomes an explicit "unknown" that pauses the plan until a sync, instead of a guess.
- The AI is bounded by code: the server validator can only clear fields, prices need a quoted dollar figure, and the assistant's five tools only read, simulate or propose. In my live test, the clock move stayed a proposal with Approve and Dismiss.
- The assistant shows its working: each reply lists the tool lines ("Read the plan", "Simulated Mon 9 Nov, 6:00pm PT with Maya Shah unpaid"), which is a good pattern to demo.
- A measured model choice: `docs/spec/ai.md` has a bake-off table that scored each model on ten fixtures after validation (AI-032).

**4. Weaknesses and shortcomings.**
- No developer-facing entry point: the README is a stub (MI-025), and the spec reads as internal notes.
- The spec contradicts itself on how the agent calls tools (AI-003), and overstates that chat text "cannot reach" the assistant (AI-022).
- No privacy or AI-provider notice on the site (MI-001, AI-023).

**5. Technical implementation concerns.**
- Local setup stalls without tribal knowledge: there is no backend `dev` script, and the required `JWT_SECRET` is empty in `.env.example` (MI-026).
- No API reference for someone who wants to build on the endpoints.

**6. Product and user-experience concerns.**
- Where captured money ends up (Foldback's sandbox merchant account) is not explained to visitors.
- The assistant's "busy" message blames "your connection" when the limit is demo-wide (AI-027).

**7. Questions this judge might reasonably ask.**
- Why authorize-then-capture rather than collecting and refunding?
- What happens when PayPal's reply to a capture never arrives?
- How do you stop the model from inventing a price?
- How would an organizer actually receive the money (PayPal multiparty)?

**8. Potential reasons the project could lose points.** A judge who reads only the README today learns almost nothing, so the strongest technical material may never be seen.

**9. Specific improvements that would increase competitiveness.**
- J-RAVI-001: a README judge guide with two short tables, "The four PayPal calls" and "What the AI may not do, and how the server enforces it", plus a link to the bake-off table (MI-025, AI-017, AI-032).
- J-RAVI-009: an Open Graph card, so the Devpost and README links render a branded preview (MI-011).
- One sentence on where captured money goes in the sandbox, and the multiparty roadmap.

**10. Score (shared rubric).**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 4 | Orders v2 authorize, capture and void with idempotency keys, operations recorded before each call, and an unknown-result pause; 715 tests pass. |
| Design | 4 | Consistent, readable design with status words everywhere and a calm pay page that puts "This is a hold, not a charge." above the fold on a phone; small gaps such as the default 404 page and the assistant's "prop_1" (MI-013, AI-010). |
| Potential Impact | 3 | A real pain (the organizer fronting money), but sandbox only, capped at four payers, and captured money goes to Foldback's sandbox merchant rather than the organizer. |
| Innovation/Idea | 4 | All-or-nothing group commitment through PayPal authorization holds, set up from a pasted chat with quoted evidence, is uncommon and fits PayPal's own primitives. |
| Presentation | 2 | The README is nine lines and still names the hackathon (MI-025), there is no video yet, and the live app has no social preview card (MI-011). |

Average: 3.4.

**11. Most important changes to prioritise.** J-RAVI-001 (README guide with the PayPal and AI tables), then J-RAVI-009 (preview card), then the privacy and provider note (AI-023).

## Consolidated Observations

[To be completed after all three reviews are available.]
