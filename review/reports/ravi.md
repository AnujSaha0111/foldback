# Audit Completion Report

Maker: Ravi. Audited on 8 November 2026, from `main` at `196f4f9`, on the local branch `review-ravi`. Nothing has been committed or pushed. No application code, deploy files, CI files, spec or README were changed.

## Assigned Responsibilities

- The AI layer: provider chain, prompts, the assistant and its tools, guardrails and hallucination control, AI security, cost and limits, and evaluation (`review/ai/`).
- Everything else (`review/misc/`): legal and privacy, frontend security configuration, SEO, performance and accessibility (with cross-references to Nishit's FE findings), forms and abuse, analytics and operations, developer experience and docs, and repo hygiene before the repo goes public.
- My independent evaluation in each of the seven `review/judges/*.md` files.

## Total Findings

63 findings: AI-001 to AI-033 (33) and MI-001 to MI-031 (30; MI-022 is unused because the error and empty states are covered by Nishit's FE findings). Of these, 35 are problems to fix (High, Medium or Low) and 28 record something already in place or out of scope.

By status: Implemented 29 (including one "by omission" and one "Not Applicable"), Partially Implemented 18, Missing 11, Needs Verification 5.

## Severity Distribution

- Critical: 0
- High: 1 (MI-025)
- Medium: 16 (AI-018, AI-022, AI-023, AI-027, AI-029, AI-030, AI-031, MI-001, MI-005, MI-007, MI-011, MI-016, MI-020, MI-026, MI-028, MI-029)
- Low: 18
- Informational: 28

No Critical security issue was found, so nothing needed escalating at once.

## Most Important Findings

1. **MI-025 (High).** The README is a nine-line stub and the judge guide is not written. Every judge lens scores Presentation from it. This overlaps with Nishit's J-NISHIT-001.
2. **MI-020 (Medium).** The demo-wide cap of 200 plans counts drafts, and the repeat-paste cache creates plans without spending AI quota. Three IPs could fill the demo in a day and block the real sandbox-hold path for up to 7 days.
3. **AI-027 (Medium).** The global cap of 12 AI attempts a minute is small next to the assistant's up-to-six steps per turn, so about three people in the same minute can see "busy". The message then blames "your connection".
4. **AI-018 (Medium).** People's names in an extraction are not checked against the pasted text, so a name the model invents becomes a share and a pay link.
5. **AI-023 / MI-001 (Medium).** Pasted chats go to DeepSeek and Google's free tier, and there is no privacy notice anywhere on the site.
6. **AI-022 (Medium).** Text taken from the chat (the title, names, event details) does reach the assistant's prompt. The spec says it cannot. The tools are read-only, so the impact is limited.
7. **MI-007 (Medium).** The web app sends only HSTS: no CSP, frame, `nosniff`, referrer or permissions headers. The API sends the full helmet set.
8. **MI-028 (Medium).** Integration tests wipe whatever database `TEST_DATABASE_URL` points at, with no guard. On this Mac they reached another project's Postgres and stopped only because the password was wrong.
9. **MI-005 (Medium).** The spec promises PayPal's official mark on the pay button, but the code has an unbranded orange button.
10. **MI-029 (Medium).** 17 hackathon mentions remain in 12 files, plus one inside `docs/design/foldback-redesign.zip` and the GHCR image name. They must go before the repo is public on 11 November.

## Judge Evaluations Completed

These are averages on the shared rubric. TI is Technological Implementation and Pres. is Presentation.

| Judge | TI | Design | Impact | Innovation | Pres. | Average |
|---|---|---|---|---|---|---|
| Jo Franchetti | 4 | 4 | 3 | 4 | 2 | 3.4 |
| Eddie Jaoude | 4 | 4 | 3 | 4 | 2 | 3.4 |
| Marco Podien | 4 | 4 | 3 | 4 | 2 | 3.4 |
| Karthik Ravi | 5 | 4 | 3 | 4 | 2 | 3.6 |
| Himraj Singh | 4 | 4 | 3 | 4 | 2 | 3.4 |
| Nathaniel Olson | 4 | 4 | 3 | 4 | 2 | 3.4 |
| Mats Bryntse | 4 | 4 | 3 | 4 | 2 | 3.4 |

- Jo Franchetti: complete (J-RAVI-001, J-RAVI-009).
- Eddie Jaoude: complete (J-RAVI-002, J-RAVI-003).
- Marco Podien: complete (J-RAVI-004).
- Karthik Ravi: complete (J-RAVI-005).
- Himraj Singh: complete (J-RAVI-006).
- Nathaniel Olson: complete (J-RAVI-007).
- Mats Bryntse: complete (J-RAVI-008).

Presentation is scored on the project as it stands today, with no README guide and no video. It should rise to 4 once the README guide and video exist. The scores are my reading of each judge's public role and lens. They do not claim to know what any judge thinks.

## Most Important Recommendations

In order, before 1 December:

1. Write the README as the judge guide (MI-025, J-RAVI-001). Include the table of four PayPal calls and the table of what the AI may not do. Remove every hackathon mention (MI-029).
2. Keep the demo from blocking itself during judging. Count only confirmed plans towards the cap (MI-020). Raise `AI_GLOBAL_PER_MIN` and fix the "busy" copy (AI-027). Verify that per-IP keys survive the tunnel (AI-030). Owner: Manveer.
3. Add a privacy and AI-provider notice (AI-023, MI-001), and correct the spec on what reaches the assistant (AI-022).
4. Make three small AI correctness fixes, each with a unit test: names must appear in the text (AI-018); `assume_not_paying` must be applied or removed (AI-013); the weekday must be checked (AI-021). Then add the eight-case assistant evaluation (AI-031). This is J-RAVI-005.
5. Add frontend security headers in `next.config` (MI-007), with a Report-Only CSP first.
6. Add an Open Graph card (MI-011), and show the PayPal mark on the pay button (MI-005).
7. Script a two-minute video (J-RAVI-004, J-RAVI-008). It should show the live board, the clock moving to the deadline, capture and release, and an unknown-result recovery.
8. Fix developer setup: add a backend `dev` script and a working quick start (MI-026), add a test-database guard (MI-028), and add the missing `.env.example` keys (MI-027).

## Skills, Plugins, and Connectors

| Tool/Skill/Plugin | Purpose | Installation Method | Status | Verification |
|---|---|---|---|---|
| Ponytail (`DietrichGebert/ponytail`, MIT) | Suggested by the audit prompt for the review workflow | `claude plugin marketplace add DietrichGebert/ponytail`, then `claude plugin install ponytail@ponytail` (it adds hooks) | Not installed: I asked first, and no install was approved | Repository and licence checked with `gh api` only |
| gitleaks | Secret scan of the full history | Not installed (third party, no approval) | Not run locally | I used a regex scan of 112 commits instead (MI-030). The CI gitleaks job is the authority. |
| Lighthouse CLI | Mobile performance and accessibility scores | Not installed (no approval) | Not run | MI-016 marked Needs Verification |
| PageSpeed Insights API (keyless) | Lighthouse scores without installing anything | None (public endpoint) | Failed: keyless quota exceeded | Recorded in MI-016 |
| claude-security plugin | Security review | Not installed (no approval) | Not used | n/a |
| `security-review` and `code-review` skills | Review of a pending diff | Built in | Available, not invoked: this audit has no application diff to review | n/a |
| `claude-api` skill | Claude API reference | Built in | Not Applicable: Foldback does not use Anthropic models (AI-033) | n/a |
| Firecrawl search (connector) | Web research on legal, SEO and PayPal guidance | Already connected | Used | Sources cited in `review/misc/01` and `03` |
| Built-in browser | Live walkthrough of app.foldback.tech | Built in | Used | Guest flow, board, assistant and pay link checked on 8 November |
| `curl` | Live response headers, robots, sitemap and CORS | System | Used | MI-007, MI-008, MI-010, MI-012, MI-015 |
| `gh` CLI | Looking up the Ponytail repository | Already installed | Used | Read-only API call |
| Docker Compose | Throwaway Postgres for the integration tests | Already installed | Used | Project `foldback-review` on ports 5435 and 5436; removed afterwards with `down -v` |

## Files Created

- `review/ai/01-architecture-and-models.md` (AI-001 to AI-006)
- `review/ai/02-prompt-engineering.md` (AI-007 to AI-011)
- `review/ai/03-agent-and-tools.md` (AI-012 to AI-016)
- `review/ai/04-guardrails-and-hallucination.md` (AI-017 to AI-021)
- `review/ai/05-ai-security.md` (AI-022 to AI-026)
- `review/ai/06-cost-reliability-limits.md` (AI-027 to AI-030)
- `review/ai/07-evaluation.md` (AI-031, AI-032)
- `review/ai/08-not-applicable.md` (AI-033)
- `review/misc/01-legal-and-privacy.md` (MI-001 to MI-006)
- `review/misc/02-frontend-security-config.md` (MI-007 to MI-010)
- `review/misc/03-seo-and-discoverability.md` (MI-011 to MI-015)
- `review/misc/04-performance-and-accessibility.md` (MI-016, MI-017)
- `review/misc/05-forms-and-abuse.md` (MI-018 to MI-021)
- `review/misc/06-analytics-and-operations.md` (MI-023, MI-024)
- `review/misc/07-developer-experience-and-docs.md` (MI-025 to MI-028)
- `review/misc/08-repo-hygiene.md` (MI-029 to MI-031)

## Files Modified

- `review/judges/jo-franchetti.md`, `eddie-jaoude.md`, `marco-podien.md`, `karthik-ravi.md`, `himraj-singh.md`, `nathaniel-olson.md`, `mats-bryntse.md`. In each, only the `_Pending._` line under "Independent Evaluation by Ravi" was replaced. Nishit's and Manveer's sections and "Consolidated Observations" are untouched.
- `review/reports/ravi.md` (this file).

## Testing and Verification

Everything I ran:

- **Backend tests: 500 of 500 passed.** I ran `corepack yarn test` with `TEST_DATABASE_URL` pointing at a throwaway Postgres. This was Docker Compose project `foldback-review` on 127.0.0.1:5435 (test) and 5436 (dev), using a scratch override file outside the repo. I removed it afterwards with `down -v`. The first attempt reached an unrelated local database on port 5433 and failed on authentication before any change was made; that is MI-028.
- **Frontend tests: 215 of 215 passed** (`corepack yarn test` in `frontend/`).
- **Live checks on app.foldback.tech:**
  - Guest sign-in and the Cabin weekend sample board on Bryntum, with the demo clock.
  - The assistant: two live calls. The first was "What happens if Maya Shah doesn't pay?", which got a grounded answer with tool lines. The second was "Move to the deadline", which produced a proposal. I did not approve it, and the reply showed "prop_1" (AI-010).
  - The sample pay link on a phone-sized screen.
  - Response headers of the app and the API, robots.txt and sitemap.xml (both 404), and a CORS check from a foreign origin (rejected).
- **Secret scan:** a regex scan of all 112 commits on fetched refs found no secrets, and no `.env` file was ever committed (MI-030).
- **What I did not do:** no load testing, no production data access, no Mac mini access, no PayPal sandbox hold placed, and no AI calls beyond the two above. AI behaviour was otherwise checked through code reading and the existing stubbed tests (`backend/test/helpers/llmStub.ts`).

## Remaining Issues

Categories complete (code read, live where possible): AI architecture and models; prompts; the assistant and its tools; guardrails; AI security; cost and limits (code side); evaluation; frontend security configuration; SEO; forms and abuse; analytics and operations; developer experience; and repo hygiene.

Still unverified:

- **MI-016:** Lighthouse mobile performance and accessibility scores. Not measured, because nothing was installed and the PageSpeed quota was exceeded.
- **AI-029:** whether the $2 DeepSeek balance lasts through 1 to 15 December. This needs the operator to read the balance and the `ai_usage` rows on the server.
- **AI-030:** whether the real client IP reaches the API through the Cloudflare tunnel with `TRUST_PROXY=1`. Manveer to verify.
- **MI-004:** which privacy regimes apply (GDPR Art 3(2), CCPA, India's DPDP Act). This is my reading, not legal advice, and it needs a lawyer before any real money is involved.
- **MI-006:** whether sandbox buyer credentials get published in the README, and how.
- **Assistant quality:** seen only through stubbed tests and two live calls. No measured accuracy exists yet (AI-031).
- **Real sandbox hold, capture and void:** I read the code and the integration tests, but did not run them live in this audit.

## Recommended Next Steps

1. The human reviews these files on `review-ravi`, then decides whether to commit and push them. I have not done either.
2. Nishit takes MI-025 together with J-NISHIT-001 (the README judge guide), and MI-011, MI-013 and MI-024 (frontend).
3. Manveer takes MI-020, AI-027, AI-030, MI-007 (or Nishit, since the headers are in `next.config`), MI-026, MI-027 and MI-028.
4. Decide on MI-029 by 10 November: a text sweep, rebuilding the ZIP (I can do it), and timing the image rename with Manveer.
5. If approved, install Lighthouse, or use a PageSpeed API key, to close MI-016 before 1 December.
6. After the AI fixes land, run the proposed eight-case assistant evaluation once against the live chain (AI-031). That is about 50 calls, so do it once, not repeatedly.
