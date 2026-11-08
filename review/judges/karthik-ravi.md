# Karthik Ravi — PayPal Judge Evaluation

Judge profile:
Software Engineer, PayPal.

## Independent Evaluation by Nishit

Evaluated on 5 November 2026 from the code (backend services, domain, repositories, the PayPal client, the frontend), the tests and the spec.

**1. Role and perspective.** Software Engineer at PayPal. The lens: code quality, correctness, architecture, engineering decisions, API design, performance, reliability, security, edge cases, testing, technical depth.

**2. Overall impression.** For a hackathon this is unusually rigorous where it matters:
- Money state lives in Postgres with guard triggers and transition tables.
- The decision of what to do with a plan (`decide`) is a pure function, so it is easy to test.
- Every PayPal call is bracketed by a pending log row.
- Unclear results pause the plan rather than move money.

The edge cases a payments engineer would ask about have answers in code and tests.

**3. Strongest aspects.**
- The unknown-result model. An authorize, capture or void whose reply was lost becomes `*_unknown`. The plan only pauses when money would move. Sync asks PayPal for the truth.
- Idempotency keyed on the PayPal object. A retry after a lost reply cannot double-capture.
- Concurrency: a session-level advisory lock per plan, capped at 5 holders per process (409 otherwise). PayPal calls run outside transactions.
- Tests: 478 backend tests, including integration tests on a real Postgres with a PayPal fake. 215 frontend tests. A strict TypeScript and lint setup.

**4. Weaknesses.**
- Some behaviour is verified only against the PayPal fake. Examples: a key retry after a refusal, and real PayPal's responses for edge statuses. This is noted in the team's own task notes.
- The `decide` outcome is not exposed as a read-only preview, so the UI cannot show what Resolve will do (FE-032).
- The frontend's performance budgets in the spec are not met or measured (FE-060, FE-064).

**5. Technical concerns.**
- The lock cap and the rate limits are per process. Running two API instances would need Postgres-backed or Redis-backed limits. Advisory locks already work across instances; the cap does not. This is Manveer's area.
- The authorization honour period: holds are guaranteed for 3 days, valid for 29. A plan with a long deadline may need reauthorization. Is that handled, or blocked by the validator? (BE area.)
- No timed resolver was found: plans resolve after the last hold, on a clock move or on Resolve. Holds on a plan nobody touches after its deadline stay until PayPal expires them. Fine for a demo driven by the clock; a gap for real use (BE area, to confirm).

**6. Product and UX concerns.**
- The UI never claims money moved before the server says so (FE-030). Good.
- The Paused banner hides a failed sync (FE-014).

**7. Questions this judge might reasonably ask.**
- Walk me through a capture whose reply is lost.
- Why advisory locks rather than `SELECT … FOR UPDATE` alone?
- How do you test against PayPal's real behaviour?
- What happens at day 30?

**8. Reasons it could lose points.** If the depth is not shown, it reads as "a split-payments app". The unknown-result model is the technical highlight and needs one diagram.

**9. Improvements that would increase competitiveness.**
- J-NISHIT-008: a "Money safety" section in the README: the state diagram for a share, the tx1 → PayPal → tx2 pattern, and the four idempotency keys.
- J-NISHIT-007: a read-only dry run of `decide` behind a GET, used by Resolve's confirm.
- J-NISHIT-009: record real sandbox runs of the edge cases (a capture after a void attempt, a retried key) in `docs/spec/paypal.md` as evidence beyond the fake.

**10. Score (shared rubric).**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 4 | Correct handling of lost replies, idempotency per object, locking, a pure decision function, and broad tests; some PayPal edge behaviour is verified only against a fake. |
| Design | 4 | A clean, consistent UI that tells the truth about money state. |
| Potential Impact | 3 | Real problem; limited by sandbox-only and no payout path. |
| Innovation/Idea | 4 | A deliberate use of authorizations as a commitment device. |
| Presentation | 2 | The depth is invisible without a README and video. |

Average: 3.4.

**11. Most important changes.** J-NISHIT-008 (show the money safety model), then J-NISHIT-007 and J-NISHIT-009.

## Independent Evaluation by Manveer

_Pending._

## Independent Evaluation by Ravi

Evaluated on 8 November 2026 from `main` at `196f4f9`, the spec in `docs/spec/`, the AI and misc reviews in `review/ai/` and `review/misc/`, and the live app at https://app.foldback.tech. Live: I tried it as a guest, opened the Cabin weekend sample board, asked the assistant two questions ("What happens if Maya Shah doesn't pay?" and "Move to the deadline"), and opened Maya's pay link on a phone-sized screen. I read the hold, resolve and sync code paths and ran the test suites (500 backend tests against a throwaway database, 215 frontend tests, all passing). The README judge guide and the video do not exist yet, so Presentation reflects today, not the planned submission.

**1. Role and perspective.** Software Engineer at PayPal. The lens: code quality, correctness, architecture, API design, edge cases, security, performance, reliability and testing depth.

**2. Overall impression.** This is unusually careful engineering for a hackathon. The money path treats every PayPal call as something that can end in three ways, and the database constraints back the code up. The AI layer has a real server-side validator. The gaps are small and specific, and most sit in the AI layer, where the money path's rigour has not yet been applied in full.

**3. Strongest aspects.**
- Authorization holds used for what they are for: one order and one authorization per friend, captured all together or voided all together, each call with its own idempotency key (`fb-order-…`, `fb-auth-…`, `fb-capture-…`, `fb-void-…`).
- Money calls are written down before they are sent and settled after, so a lost PayPal reply becomes an explicit "unknown" that pauses the plan until a sync, instead of a guess.
- The AI is bounded by code: the server validator can only clear fields, prices need a quoted dollar figure, and the assistant's five tools only read, simulate or propose. In my live test, the clock move stayed a proposal with Approve and Dismiss.
- Correctness under failure: a capture or void that PayPal refuses is checked against the authorization or order first, because it may be a replay of a call that already succeeded.
- Testing depth: 500 backend tests, including integration tests against real Postgres for holds, resolve, operations, the scheduler and the agent, plus 215 frontend tests; validator rules have 33 unit cases.
- Typed, shared API contracts (`shared/api-types.ts`, generated into the frontend) and zod at every boundary.

**4. Weaknesses and shortcomings.**
- People's names in an extraction are not checked against the pasted text, so a hallucinated name becomes a share and a pay link (AI-018).
- `simulate_outcome` accepts `assume_not_paying` but ignores it while its summary line claims it (AI-013).
- No evaluation of the assistant's answers, only stubbed plumbing tests (AI-031).

**5. Technical implementation concerns.**
- Budget checks are count-then-spend, not reservations, so caps can overshoot by the number of concurrent requests (AI-028); acceptable at this scale.
- A weekday in a deadline ("Friday") is resolved only by the model; the server could check it in about 15 lines (AI-021).
- Agent step exhaustion returns 503 after spending up to six attempts (AI-012).

**6. Product and user-experience concerns.**
- Error copy for the global AI limit is misleading (AI-027).

**7. Questions this judge might reasonably ask.**
- How do you prevent a double capture if the capture reply is lost and the user presses Resolve again?
- What stops a pasted chat from changing the price?
- Why a JSON step protocol instead of native tool calling?
- How is the agent's quality measured?

**8. Potential reasons the project could lose points.** A reviewer who finds the names gap or the ignored simulation parameter may question how far the AI side's guarantees go, given how strong the money side is.

**9. Specific improvements that would increase competitiveness.**
- J-RAVI-005: fix AI-018 (names must appear in the text), AI-013 (apply or remove `assume_not_paying`) and AI-021 (weekday check), each with a unit test; then add the eight-case assistant evaluation (AI-031).
- Explain the three-outcome PayPal call model in the README with one sequence diagram (pairs with J-RAVI-001).

**10. Score (shared rubric).**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 5 | Exceptional for the format: two-phase recorded PayPal calls with idempotency keys and replay checks, database constraints that refuse bad states, a server-side AI validator, and 715 passing tests. |
| Design | 4 | Consistent, readable design with status words everywhere and a calm pay page that puts "This is a hold, not a charge." above the fold on a phone; small gaps such as the default 404 page and the assistant's "prop_1" (MI-013, AI-010). |
| Potential Impact | 3 | A real pain (the organizer fronting money), but sandbox only, capped at four payers, and captured money goes to Foldback's sandbox merchant rather than the organizer. |
| Innovation/Idea | 4 | All-or-nothing group commitment through PayPal authorization holds, set up from a pasted chat with quoted evidence, is uncommon and fits PayPal's own primitives. |
| Presentation | 2 | The README is nine lines and still names the hackathon (MI-025), there is no video yet, and the live app has no social preview card (MI-011). |

Average: 3.6.

**11. Most important changes to prioritise.** J-RAVI-005 (the three small AI correctness fixes with tests), then AI-031 (assistant evaluation), then the README sequence diagram.

## Consolidated Observations

[To be completed after all three reviews are available.]
