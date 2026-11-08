# Marco Podien — PayPal Judge Evaluation

Judge profile:
Developer Advocate, PayPal.

## Independent Evaluation by Nishit

Evaluated on 5 November 2026 from the code, the spec and the deployed app.

**1. Role and perspective.** Developer Advocate at PayPal. The lens: how good is the technical implementation and the integration? How usable and accessible is the product, how good are the docs, how easy is it to demonstrate, and could people adopt it?

**2. Overall impression.** The integration is the strongest part. Authorize, capture and void each go through a pattern that survives retries and lost replies:
1. A first transaction locks the plan and writes a pending operation.
2. The PayPal call runs outside any transaction.
3. A second transaction applies the result.

The product is also easy to demonstrate: guest sign-in, sample plans, and a demo clock. What is missing is the packaging: the docs for visitors and the video.

**3. Strongest aspects.**
- The integration quality: idempotency keys per PayPal object. A capture wave stops at the first unclear result. Replays are read back from PayPal rather than assumed.
- Demo-ability: "Advance to deadline" and "Advance to grace end" turn a multi-day rule into a 30-second demo, and "Reset demo data" makes it repeatable.
- The pay page is phone-first, with plain copy: "This is a hold, not a charge."
- The AI rule reader shows the line of the chat it used for each term, which builds trust.

**4. Weaknesses.**
- Without a guide, a visitor will not find the clock controls or understand that they are demo-only.
- The Resolve button gives no preview (FE-032).
- The pay page's JS is over its own budget (FE-060), which matters on phones.

**5. Technical concerns.**
- The live updates depend on a Socket.IO server on a single host. If it is down, the 10-second polling fallback hides that, which is good, but nobody is told.
- No end-to-end test of the sandbox round trip (FE-081). It is checked by hand.

**6. Product and UX concerns.**
- The board on a phone is cramped (FE-051).
- The person popup and the assistant work well. The assistant's conversation is lost on reload (FE-013).

**7. Questions this judge might reasonably ask.**
- How long can a hold wait?
- What does the friend see if PayPal is slow?
- How does the organizer know a plan is paused, and why?

**8. Reasons it could lose points.** A judge who does not run the app sees only the video and the README. Both are pending.

**9. Improvements that would increase competitiveness.**
- J-NISHIT-002: a video that demonstrates the clock: hold, advance to deadline, kept; then a second plan, advance, released.
- J-NISHIT-006: a 3-line "Try it" box in the README: open the live link, choose "Try it as a guest", open "Cabin weekend (sample)", press "Advance to deadline".
- J-NISHIT-007: a preview on Resolve ("Capture 4 holds, $320") from a server dry run (FE-032).

**10. Score (shared rubric).**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 4 | A robust authorize/capture/void integration with idempotency and unknown-result handling, deployed and tested. |
| Design | 4 | Clear status words, phone-first pay page, skeletons and touch targets; the board on a phone and Resolve preview lag. |
| Potential Impact | 3 | Solves a real coordination problem; adoption needs payouts and a merchant story. |
| Innovation/Idea | 4 | Holds as group commitment plus an AI that turns a chat into the rule. |
| Presentation | 3 | The live app demonstrates itself well (guest, samples, demo clock), but there is no README guide or video yet. |

Average: 3.6.

**11. Most important changes.** J-NISHIT-002 (the video), J-NISHIT-006 (Try it box), J-NISHIT-007 (Resolve preview).

## Independent Evaluation by Manveer

_Pending._

## Independent Evaluation by Ravi

Evaluated on 8 November 2026 from `main` at `196f4f9`, the spec in `docs/spec/`, the AI and misc reviews in `review/ai/` and `review/misc/`, and the live app at https://app.foldback.tech. Live: I tried it as a guest, opened the Cabin weekend sample board, asked the assistant two questions ("What happens if Maya Shah doesn't pay?" and "Move to the deadline"), and opened Maya's pay link on a phone-sized screen. I read the hold, resolve and sync code paths and ran the test suites (500 backend tests against a throwaway database, 215 frontend tests, all passing). The README judge guide and the video do not exist yet, so Presentation reflects today, not the planned submission.

**1. Role and perspective.** Developer Advocate at PayPal with a lens on technical implementation quality, integration quality, and how easy the product is to demonstrate and adopt.

**2. Overall impression.** Strong integration quality and a very demo-friendly product: guest mode, sample plans and a demo clock make the whole hold-then-capture-or-release story fit in a minute. What is missing is the packaging that lets a judge see it without being walked through.

**3. Strongest aspects.**
- Authorization holds used for what they are for: one order and one authorization per friend, captured all together or voided all together, each call with its own idempotency key (`fb-order-…`, `fb-auth-…`, `fb-capture-…`, `fb-void-…`).
- Money calls are written down before they are sent and settled after, so a lost PayPal reply becomes an explicit "unknown" that pauses the plan until a sync, instead of a guess.
- The AI is bounded by code: the server validator can only clear fields, prices need a quoted dollar figure, and the assistant's five tools only read, simulate or propose. In my live test, the clock move stayed a proposal with Approve and Dismiss.
- Demo-ability: "Try it as a guest" lands on two sample plans, the board's demo clock jumps to the deadline or grace end, and the assistant proposes the move with a preview.
- The pay page is mobile-first and states the condition plainly, which is exactly what a payer needs.

**4. Weaknesses and shortcomings.**
- Presentation assets are missing (README, video, preview card).
- The demo-wide cap of 200 user-made plans can be filled cheaply, which would block the real sandbox-hold path in the judge guide (MI-020).
- The assistant can return "busy" when three people use it in the same minute (AI-027).

**5. Technical implementation concerns.**
- Per-IP limits depend on the real client IP surviving the Cloudflare tunnel, which is unverified (AI-030).
- No Lighthouse numbers exist yet (MI-016, FE-064).

**6. Product and user-experience concerns.**
- The real-PayPal step (paste, confirm, pay link, sandbox login) depends on judges finding sandbox buyer credentials, which are not published yet (MI-006).

**7. Questions this judge might reasonably ask.**
- Can I see a real sandbox hold and capture end to end?
- What happens if two people resolve at once?
- How do you demo the failure cases?

**8. Potential reasons the project could lose points.** If the judge guide's real-PayPal step fails (demo full, assistant busy, or credentials not listed), the most PayPal-specific part of the demo is lost.

**9. Specific improvements that would increase competitiveness.**
- J-RAVI-004: a two-minute video script that names each PayPal call on screen (hold, the clock to the deadline, capture, then the release case) and shows one unknown-result pause and recovery.
- Fix MI-020 (count only confirmed plans towards the cap) and raise `AI_GLOBAL_PER_MIN` (AI-027) before 1 December.
- Publish a judge-only sandbox buyer account (MI-006).

**10. Score (shared rubric).**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 4 | Careful integration: server-created orders, full-page approval redirect, return handling that is safe under React StrictMode, sync on unknown, and capture or void replays checked before acting. |
| Design | 4 | Consistent, readable design with status words everywhere and a calm pay page that puts "This is a hold, not a charge." above the fold on a phone; small gaps such as the default 404 page and the assistant's "prop_1" (MI-013, AI-010). |
| Potential Impact | 3 | A real pain (the organizer fronting money), but sandbox only, capped at four payers, and captured money goes to Foldback's sandbox merchant rather than the organizer. |
| Innovation/Idea | 4 | All-or-nothing group commitment through PayPal authorization holds, set up from a pasted chat with quoted evidence, is uncommon and fits PayPal's own primitives. |
| Presentation | 2 | The README is nine lines and still names the hackathon (MI-025), there is no video yet, and the live app has no social preview card (MI-011). |

Average: 3.4.

**11. Most important changes to prioritise.** J-RAVI-004 (video script), then MI-020 and AI-027 so the demo cannot block itself during judging.

## Consolidated Observations

[To be completed after all three reviews are available.]
