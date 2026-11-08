# Eddie Jaoude — PayPal Judge Evaluation

Judge profile:
Developer Advocate, PayPal.

## Independent Evaluation by Nishit

Evaluated on 5 November 2026 from the code, the spec and the deployed app. The repo is private until 11 November, so open-source readiness is judged on what will be published.

**1. Role and perspective.** Developer Advocate at PayPal. The lens: is this accessible to other developers? Could it become a community project? How easy is the setup, and how good are the docs, the workflows, and the practical value?

**2. Overall impression.** Foldback is very well run as a codebase:
- MIT licence.
- CI with format, type, lint, unused-code and duplication gates.
- 478 backend tests and 215 frontend tests.
- Small, consistent folders.
- A spec folder that explains every decision.

It is not yet ready for strangers. The README is a placeholder, and setup lives in `docs/team-setup.md`, which is written for the team.

**3. Strongest aspects.**
- Contributor-friendly quality gates. The same `yarn format:check && typecheck && lint && knip && dup && test` runs locally and in CI.
- Clean separation: routes, services, repositories, a pure `domain/`, and integrations. Plain `fetch` for PayPal and the LLMs, with no SDK lock-in.
- The demo works without accounts: guest mode and sample plans.
- A backend `.env.example` and a dev compose file for Postgres. The frontend has no `.env.example`; it needs `NEXT_PUBLIC_API_URL` even to build (Ravi's developer-experience area).

**4. Weaknesses.**
- The README does not yet say what the project is for, how to run it, or how to contribute.
- No CONTRIBUTING, no issue templates, no "good first issue" list. These are fine for a hackathon, but they matter if the community potential is a goal.
- Running the board locally needs a Bryntum licence or trial; that is not stated where a newcomer would look.

**5. Technical concerns.**
- Two separate Yarn packages (not a workspace) is simple, but means two installs and two sets of commands; the README should say so.
- The live AI chain needs a DeepSeek key, a Groq key and a Gemini key to behave as in production. A contributor needs to know that the tests use stubs (`backend/test/helpers/llmStub.ts`) and need no keys.

**6. Product and UX concerns.**
- The command menu and keyboard paths are now there, which developers notice. Accessibility checks (contrast, screen reader) are still unverified (FE-047).

**7. Questions this judge might reasonably ask.**
- Can I run this without a PayPal account? (Tests yes, the real flow no: sandbox credentials are needed.)
- What would a contributor work on first?
- Is the AI optional?

**8. Reasons it could lose points.** On 11 November the repo goes public with a one-paragraph README. A developer advocate's first click is the README.

**9. Improvements that would increase competitiveness.**
- J-NISHIT-001 (README judge guide, shared with the other evaluations), with a "Run it locally in 5 steps" section: Postgres via compose, the backend `.env.example` plus `NEXT_PUBLIC_API_URL` for the frontend, sandbox app credentials, `yarn dev` in each package, and the Bryntum trial note.
- J-NISHIT-004: a short "What's next" with three concrete open issues (payout to the organizer through multiparty, booking links, Playwright end-to-end). This shows where a contributor could help.
- J-NISHIT-005: say plainly that the tests need no keys and no PayPal account.

**10. Score (shared rubric).**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 4 | Strict TypeScript, strong CI gates, 693 tests in total, and a tidy layering a newcomer can follow. |
| Design | 4 | Consistent components and tokens; the product reads clearly on phone and desktop. |
| Potential Impact | 3 | Useful as a reference for PayPal authorizations; as a product it still lacks payouts. |
| Innovation/Idea | 4 | An all-or-nothing group payment from a chat is a fresh use of PayPal holds. |
| Presentation | 2 | No public README guide or video yet; the setup docs are internal. |

Average: 3.4.

**11. Most important changes.** The README (J-NISHIT-001 with a local setup section), then the "What's next" issues (J-NISHIT-004).

## Independent Evaluation by Manveer

_Pending._

## Independent Evaluation by Ravi

Evaluated on 8 November 2026 from `main` at `196f4f9`, the spec in `docs/spec/`, the AI and misc reviews in `review/ai/` and `review/misc/`, and the live app at https://app.foldback.tech. Live: I tried it as a guest, opened the Cabin weekend sample board, asked the assistant two questions ("What happens if Maya Shah doesn't pay?" and "Move to the deadline"), and opened Maya's pay link on a phone-sized screen. I read the hold, resolve and sync code paths and ran the test suites (500 backend tests against a throwaway database, 215 frontend tests, all passing). The README judge guide and the video do not exist yet, so Presentation reflects today, not the planned submission.

**1. Role and perspective.** Developer Advocate at PayPal with an open-source and community lens: could another developer clone, run, understand and contribute to this; is the setup easy and the documentation good; would a community form around it?

**2. Overall impression.** The codebase is clean, consistent and heavily tested, which is a good base for an open-source project. The surrounding open-source experience is missing: the README is a stub, setup needs steps that are not written down, and there is nothing for a first-time contributor.

**3. Strongest aspects.**
- Authorization holds used for what they are for: one order and one authorization per friend, captured all together or voided all together, each call with its own idempotency key (`fb-order-…`, `fb-auth-…`, `fb-capture-…`, `fb-void-…`).
- Money calls are written down before they are sent and settled after, so a lost PayPal reply becomes an explicit "unknown" that pauses the plan until a sync, instead of a guess.
- The AI is bounded by code: the server validator can only clear fields, prices need a quoted dollar figure, and the assistant's five tools only read, simulate or propose. In my live test, the clock move stayed a proposal with Approve and Dismiss.
- MIT licence in place (MI-031), CI with lint, typecheck, tests, a whole-history secret scan and a dependency audit, and no secrets in the history (MI-030).
- Consistent conventions (one `baseApi`, a styled file per component, a layered backend) that a contributor can learn from one folder.

**4. Weaknesses and shortcomings.**
- README stub (MI-025); no CONTRIBUTING file or issue templates.
- Running locally needs undocumented steps: no backend `dev` script, a required secret left empty, and fixed ports 5432 and 5433 (MI-026).
- Integration tests wipe whatever database the test URL points at; on my machine they hit another project's database and were stopped only by a wrong password (MI-028).

**5. Technical implementation concerns.**
- `.env.example` omits `LLM_CHAIN` and four other keys, so the free-models-only option is invisible (MI-027).
- The Bryntum Scheduler is a commercial trial package, so a contributor cannot build the board without accepting its licence; this needs a README line (MI-031).

**6. Product and user-experience concerns.**
- The guest flow is a great zero-friction entry for anyone curious; keep it prominent.

**7. Questions this judge might reasonably ask.**
- How long does it take a new developer to run it locally?
- Can I run it with only free AI models?
- What is the licence situation for the Bryntum board?
- Where would a contributor start?

**8. Potential reasons the project could lose points.** An open-source-minded judge who clones the repo and cannot run it in ten minutes will mark down Presentation and doubt adoption potential.

**9. Specific improvements that would increase competitiveness.**
- J-RAVI-002: a backend `dev` script and a five-command quick start in the README that works on a clean machine, with a note on overriding ports (MI-026).
- J-RAVI-003: after the repo goes public, a short CONTRIBUTING.md and three "good first issue" tickets taken from this audit's Low findings (for example MI-013, MI-014, AI-010).
- A test-database guard, so a contributor's own Postgres can never be wiped (MI-028).

**10. Score (shared rubric).**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 4 | Clean layered code, typed shared contracts between backend and frontend, and 715 passing tests, with CI gates a contributor can trust. |
| Design | 4 | Consistent, readable design with status words everywhere and a calm pay page that puts "This is a hold, not a charge." above the fold on a phone; small gaps such as the default 404 page and the assistant's "prop_1" (MI-013, AI-010). |
| Potential Impact | 3 | A real pain (the organizer fronting money), but sandbox only, capped at four payers, and captured money goes to Foldback's sandbox merchant rather than the organizer. |
| Innovation/Idea | 4 | All-or-nothing group commitment through PayPal authorization holds, set up from a pasted chat with quoted evidence, is uncommon and fits PayPal's own primitives. |
| Presentation | 2 | The README is nine lines and still names the hackathon (MI-025), there is no video yet, and the live app has no social preview card (MI-011). |

Average: 3.4.

**11. Most important changes to prioritise.** J-RAVI-002 (quick start that works), MI-028 (test-database guard), then J-RAVI-003 once public.

## Consolidated Observations

[To be completed after all three reviews are available.]
