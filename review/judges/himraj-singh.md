# Himraj Singh — PayPal Judge Evaluation

Judge profile:
Engineering Manager, PayPal.

## Independent Evaluation by Nishit

Evaluated on 5 November 2026 from the code, the CI, the deploy files and the spec.

**1. Role and perspective.** Engineering Manager at PayPal. The lens: system architecture, maintainability, scalability, organisation, trade-offs, engineering quality, security, reliability, practices, long-term sustainability, production readiness.

**2. Overall impression.** Engineering practice is strong for a three-person, three-week project:
- Written spec, phase plans and quality rules.
- Gates in CI.
- Reviews of every money change by a second person.
- Auto-deploy of the API from `main`.

The architecture is a sensible monolith. The production story has clear single points of failure, and those should be stated, not hidden.

**3. Strongest aspects.**
- Process: a phase-by-phase spec, a permanent quality rulebook, CI gates (format, types, lint, unused code, duplication, tests), and a second-reviewer rule for money, auth and deletion.
- Maintainability: small files, an enforced complexity limit, plain SQL migrations, no ORM magic, no LLM SDK.
- Security posture: an httpOnly JWT cookie, an Origin check on mutations, zod at every boundary, rate limits, helmet, sandbox-only PayPal, and secrets only in env.
- Cost control: a $2 prepaid DeepSeek balance with no card, then free models, plus per-user, per-plan and daily AI caps.

**4. Weaknesses.**
- A single Mac mini behind a Cloudflare Tunnel serves the API, database and sockets. Backups and restore are Manveer's area to verify.
- Per-process state (rate limits, lock cap, socket rooms) blocks horizontal scaling without changes.
- External time bombs during the judging window (1 to 15 December):
  - The Bryntum trial key must be renewed before 1 December.
  - The DeepSeek balance can run out (the chain falls back to the free models).
  - Guest accounts expire after 7 days.

**5. Technical concerns.**
- No measured frontend performance (FE-064) despite budgets in the spec.
- No uptime monitoring that alerts a person. Prometheus metrics exist, but who watches them during judging?

**6. Product and UX concerns.** Few. The demo controls are clearly separated, and the UI is honest about sandbox money.

**7. Questions this judge might reasonably ask.**
- What happens if the Mac mini restarts mid-capture?
- How would you run two instances?
- Who is on call between 1 and 15 December?
- What releases the holds when a deadline passes and nobody opens the board?
- How long until this is production-ready with real money?

**8. Reasons it could lose points.** If the live demo is down or the board's trial key has lapsed when a judge clicks, every other strength is moot.

**9. Improvements that would increase competitiveness.**
- J-NISHIT-010: a "Keep the demo alive" checklist for 1 to 15 December:
  - Renew the Bryntum key before 1 December.
  - Set a DeepSeek balance alert, or accept the free fallback.
  - Add an external uptime ping on `/api/health` that alerts a phone.
  - Run a reset of the sample plans each morning.
  - Check the Postgres backup.
- J-NISHIT-011: a short "Production gaps" section in the README: a single host, per-process limits, sandbox only, and what each would take. Naming them reads as maturity.

**10. Score (shared rubric).**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 4 | Disciplined architecture and practices with CI gates and reviews; production runs on one host with per-process state. |
| Design | 4 | Consistent system and honest UI; operational screens (Paused banner) are clear. |
| Potential Impact | 3 | A real need; the path to real money (payouts, compliance) is not yet designed. |
| Innovation/Idea | 4 | Holds as a group commitment, configured by AI, is a distinctive idea. |
| Presentation | 2 | No judge-facing guide or video yet. |

Average: 3.4.

**11. Most important changes.** J-NISHIT-010 (keep the demo alive through judging), then J-NISHIT-011 and J-NISHIT-001.

## Independent Evaluation by Manveer

Evaluated on 10 November 2026 from the backend architecture, the schema, the Dockerfile, both Compose files, every deploy script and launchd job, the CI workflow, a full local run of every gate (all green), temporary probe tests (deleted afterwards), read-only checks of the production API's headers and health, and the live app.

**1. Role and perspective.** Engineering Manager at PayPal. The lens: system architecture, maintainability, scalability, code organization, technical trade-offs, engineering quality, security, reliability, development practices, long-term sustainability and production readiness.

**2. Overall impression.** Production-minded well beyond the usual hackathon entry. CI builds multi-architecture images only after every gate passes; the server pulls them, migrates, health-checks, smoke-tests the exact commit and rolls back on failure. Backups run daily and have a restore check. The database uses a DML-only role, and kill switches exist for PayPal writes, AI and sign-ups. The gaps are the ones a single-host system usually has: no metrics or alerting, a rollback that breaks across a schema change, and a rename the release process does not yet survive.

**3. Strongest aspects.**
- Layering that holds: routes → controllers → services → repositories, a pure `domain/`, one integration module per provider.
- A spec-first workflow with permanent quality gates (dead code, duplication, coverage thresholds, shared-type sync) enforced in CI.
- Invariants in the database (transition tables, guard triggers, write-once columns, least-privilege role), so a code bug fails safely.
- Readable operations scripts with per-job locks, `.env` validation without printing values, and a smoke test that checks the deployed commit.

**4. Weaknesses and shortcomings.**
- BE-008: no `/metrics` and no tracing, although the spec, the p95 budgets and the runbook rely on them (production `/metrics` answers 404).
- BE-011: nothing alerts anyone if the single Mac mini goes down during judging.
- BE-022: rolling back after a deploy that added a migration leaves the old backend unable to start (proven: `migrationsCurrent` goes from `true` to `false`).
- BE-021: the 11 November rename moves the CI image path, and deploys then stop without any error.

**5. Technical implementation concerns.**
- Single instance by design; the per-process parts are listed in BE-020, and the correctness-critical parts are already in Postgres.
- Per-day rate limits are in memory and reset on every auto-deploy (BE-019).
- Shutdown allows 10 s, while a capture wave can take up to a minute (BE-010).

**6. Product and user-experience concerns.** Judges behind one office or VPN address share a 5-per-day guest limit (BE-013), and the whole demo shares a 200-plan cap (BE-006). Both are availability risks during judging, not design flaws.

**7. Questions this judge might reasonably ask.**
- How do you run two instances?
- What is your rollback story when a deploy changes the schema?
- How would you know the API was down at 3 am?
- Why a Mac mini at home, and what is the plan if it loses power?

**8. Potential reasons the project could lose points.** The spec claims metrics and a working rollback; a reviewer who checks will find neither, and over-claiming costs more than stating limits.

**9. Specific improvements that would increase competitiveness.**
- J-MANVEER-002: pin the image name before the rename, then pin `BACKEND_TAG` to a fixed commit for 1 to 15 December and raise the stop grace period.
- J-MANVEER-003: a judge-access checklist: the guest limit (BE-013), the 200-plan cap (BE-006), an uptime alert (BE-011), the Bryntum trial key (J-NISHIT-010).
- J-MANVEER-004: build the small `/metrics` behind its token, or mark it future work, and fix `migrationsCurrent` so rollback works (BE-022).
- J-MANVEER-008 and J-NISHIT-011: a short "production gaps and what's next" section using the BE-020 checklist.

**10. Score (shared rubric).**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 4 | CI-built images, pull deploys with smoke and rollback, backups, least-privilege roles and database-enforced invariants; missing metrics and alerting and a rollback gap across migrations. |
| Design | 4 | A well-organized system with clear boundaries and a coherent product UI. |
| Potential Impact | 3 | Sound foundations, but one host, sandbox only and small groups limit real-world reach today. |
| Innovation/Idea | 4 | A distinctive use of PayPal authorizations, engineered with care. |
| Presentation | 2 | The engineering story is in an internal spec that is partly out of date; no README guide or video yet. |

Average: 3.4.

**11. The most important changes to prioritize.** J-MANVEER-002 (rename and freeze), J-MANVEER-003 (judge-access checklist), then J-MANVEER-004 (metrics or an honest spec, and a working rollback).

## Independent Evaluation by Ravi

_Pending._

## Consolidated Observations

[To be completed after all three reviews are available.]
