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

Evaluated on 10 November 2026 from a line-by-line read of the money code (`holds`, `sync`, `resolve`, `clock` services, `domain/decide`, `domain/payable`, the PayPal client, `db/tx.ts`, the schema and its triggers), the full test run (500 tests green, coverage collected), four temporary probe tests that I wrote and then deleted, and the live app (guest session, board, one assistant question, one pay link).

**1. Role and perspective.** Software Engineer at PayPal. The lens: code quality, algorithms and data structures where relevant, architecture, implementation correctness, engineering decisions, API design, performance, reliability, security, edge cases, testing and technical depth.

**2. Overall impression.** This is the part of the project that would hold up in a payments code review. The money state lives in Postgres and the database itself refuses illegal moves. Every PayPal write is recorded `pending` before it is sent, runs outside any transaction, and is settled in a second transaction. An unclear reply pauses the plan rather than guessing. When I went looking for a failure, I found one place where the error classification is too coarse (BE-001) and one recovery path that does not exist (BE-002). Both are narrow, both are now proven by a test, and both are fixable in a day.

**3. Strongest aspects.**
- "Capture only when the decision is keep" is enforced three times: in `runResolve`, in a share trigger, and in an operation-insert trigger. `direction`, `authorization_id` and `capture_id` are write-once in the schema.
- Idempotency keys come from the PayPal object (`fb-capture-{authorizationId}`), and a partial unique index allows one live row per key and one in-flight write per share, so a retry can never become a second capture.
- Replays are read, not assumed: a refused capture checks the order for an existing capture; a refused void checks the authorization.
- `decide` is pure and shared with the assistant's simulator.
- Tests use real Postgres and real concurrency: two resolves racing run one wave; four resets at once leave exactly two samples. Coverage is 99.5 % of lines in `domain/` and 96.2 % in `services/`.

**4. Weaknesses and shortcomings.**
- BE-001: `classify` treats any 4xx with a JSON body as a business refusal. A 429 `RATE_LIMIT_REACHED` or a 401 on the first capture ends as `capture_failed` with the plan blocked for good and three holds left live (probe output: `{"A":"capture_failed","B":"held","C":"held","D":"held"}`).
- BE-002: after any capture refusal mid-wave, there is no path to release the remaining holds, although the transition table already allows it.
- BE-026: a few money paths have no test, including the recovery of a lost capture that PayPal did complete (`sync.service.ts:187-193`) and the 5-holder lock cap (`tx.ts:39`).
- BE-027: the PayPal fake replays scripted answers; it does not model PayPal's key replay or object state.

**5. Technical implementation concerns.**
- Limits, socket rooms and the lock-holder cap are per process (BE-019, BE-020); correctness across instances is already in Postgres.
- The operation log records `failed` for a capture that a replay read proved happened (BE-004).

**6. Product and user-experience concerns.** The landing page says "Kept or released. Never in between." BE-002 is exactly an in-between state.

**7. Questions this judge might reasonably ask.**
- What happens when PayPal answers your capture with a 429?
- Why is `capture_failed` terminal, and what happens to everyone else's hold?
- How do you know sandbox replays a reused `PayPal-Request-Id` the way your fake does?
- Why a session advisory lock and `SELECT … FOR UPDATE`? (The advisory lock spans the PayPal call, which must run outside a transaction; the row lock serializes each of the two short transactions.)

**8. Potential reasons the project could lose points.** An engineer probing the failure model finds BE-001 inside the very code that impresses them, and BE-002 contradicts the product's headline.

**9. Specific improvements that would increase competitiveness.**
- J-MANVEER-001: fix BE-001 (treat 401, 408 and 429 as "not processed", like a call that never left) with a test, and add the BE-002 recovery or state the limit in the README.
- J-MANVEER-005: record a real sandbox run of the edge cases in `paypal.md` (same as J-NISHIT-009).
- The four tests listed in BE-026.
- J-NISHIT-008: the money-safety section, which can now cite these tests.

**10. Score (shared rubric).**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 4 | Database-enforced invariants, idempotency per object, tx1 → PayPal → tx2, and race tests on real Postgres; one proven misclassification (BE-001) and a missing recovery path (BE-002) stop it short of exceptional. |
| Design | 4 | Clean API contract with stable error codes, and a UI that never claims money moved before the server says so. |
| Potential Impact | 3 | Solves a real coordination problem, but only in sandbox and for 2 to 4 people. |
| Innovation/Idea | 4 | A deliberate, well-reasoned use of authorize-then-decide as a commitment device. |
| Presentation | 2 | The depth is invisible without the README and video, which are not ready. |

Average: 3.4.

**11. The most important changes to prioritize.** J-MANVEER-001 (BE-001 and BE-002), then the BE-026 tests, then J-MANVEER-005 and J-NISHIT-008 so the evidence is visible.

## Independent Evaluation by Ravi

_Pending._

## Consolidated Observations

[To be completed after all three reviews are available.]
