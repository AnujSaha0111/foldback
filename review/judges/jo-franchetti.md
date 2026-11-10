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

Evaluated on 10 November 2026 from the backend code, the PayPal integration and its spec (`docs/spec/paypal.md`, `api.md`), the full backend test run (500 tests green), and the live app at `https://app.foldback.tech`: a guest session, the Cabin weekend board, one assistant question ("What happens if Maya Shah doesn't pay?") and Maya's pay link.

**1. Role and perspective.** Developer Advocate at PayPal. The lens: developer experience, how easy the project is to understand and adopt, the API and integration experience, documentation, developer friendliness, practical usability, technical communication, and how well the product shows what it can do.

**2. Overall impression.** The product explains itself well in the app: the landing page shows a hold turning into a capture or a release, and the pay page says "This is a hold, not a charge" in plain words. Under it sits a clean, readable PayPal integration: Orders v2 with `intent: AUTHORIZE`, then Payments v2 capture, void and get, in plain `fetch`, with one idempotency key per PayPal object. `paypal.md` would work as a tutorial for "authorize now, decide later". What a developer meets first, though, is a 9-line work-in-progress README, two days before submission.

**3. Strongest aspects.**
- `docs/spec/paypal.md`: request bodies, the four idempotency keys and why they are per object, how every reply is classified, and the sync mapping table. It is rare for a hackathon project to document the unhappy paths of a payment API this precisely.
- `docs/spec/api.md`: every route, every error code, and the rule that a lost PayPal reply is `200 outcome: unknown`, not an error.
- The assistant answered my question by simulating the real rule twice (at the deadline and at grace end) and showed both simulations under its reply.
- The pay page is short, honest and labelled ("This is a sample plan. No PayPal payment is possible.").

**4. Weaknesses and shortcomings.**
- No judge or developer entry point yet: the README is a placeholder.
- A guest sees only the two sample plans, which can never reach PayPal. Seeing a real sandbox hold means creating a plan and paying with a sandbox buyer account, and nothing explains that path today.
- Parts of the spec overclaim: `/metrics`, OpenTelemetry and a rollback that works across migrations are described but not true (BE-008, BE-022, BE-017).
- Local setup has friction I hit myself: Node 24 is required, and the dev Compose file fails if anything else already uses port 5432.

**5. Technical implementation concerns.**
- The spec's own classification rule (every 4xx with a JSON body is a refusal) turns a 429 or 401 on capture into a permanent refusal (BE-001). A developer copying this integration would copy the gap.
- No metrics endpoint, so the integration's health cannot be shown with numbers (BE-008).

**6. Product and user-experience concerns.**
- At an 800 px-wide window the board's timeline needs horizontal scrolling (see FE-051).
- "Resolve now" does not say what it will do before it acts (FE-032).

**7. Questions this judge might reasonably ask.**
- Why authorize-then-capture rather than charging and refunding?
- How do I reproduce one real sandbox hold from start to finish?
- Why no PayPal SDK, and where did the REST docs fall short?
- Which parts of the PayPal docs did you have to work out by testing?

**8. Potential reasons the project could lose points.** Presentation: without a README guide and a video, the depth of the integration is invisible, and a judge who only tries the guest mode never sees PayPal at all.

**9. Specific improvements that would increase competitiveness.**
- J-NISHIT-001: the README judge guide.
- J-MANVEER-006: a documented path to a real sandbox hold for a judge: "Use the sample cabin chat" → confirm → open a pay link → log in with the sandbox buyer → held → Advance to deadline → kept. The sample chat's reading is cached for 24 hours by text and paste time, so this path makes at most one paid model call per day (confirm with Ravi).
- J-MANVEER-004: make the spec match the code (metrics, rollback, the drift list in BE-017).
- J-MANVEER-007: a short "Run it locally" note: Node 24, start only `postgres-test` for the tests, and the tests need no PayPal or model keys.

**10. Score (shared rubric).**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 4 | A careful, well-documented Orders v2 and Payments v2 integration with idempotency per object and an explicit unknown-result model; BE-001 and the missing metrics keep it from exceptional. |
| Design | 4 | Clear landing page, pay page and board copy that explain holds plainly; the board is cramped at narrow widths. |
| Potential Impact | 3 | A real, relatable problem, but sandbox only, 2 to 4 people, and no payout to the organizer yet. |
| Innovation/Idea | 4 | Using PayPal authorizations as an all-or-nothing group commitment is a fresh, well-chosen use of an existing API. |
| Presentation | 2 | The README is a placeholder and the video is not recorded yet; the spec is rich but internal and partly stale. |

Average: 3.4.

**11. The most important changes to prioritize.** J-NISHIT-001 (README guide) together with J-MANVEER-006 (a judge path to a real sandbox hold), then J-MANVEER-004 (an honest spec).

## Independent Evaluation by Ravi

_Pending._

## Consolidated Observations

[To be completed after all three reviews are available.]
