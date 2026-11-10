# Audit Completion Report

Maker: Manveer. Branch: `review-manveer`, cut from `main` at `196f4f9` (fast-forwarded from `5f72725` on 10 November 2026, equal to `origin/main`). Nothing committed or pushed.

## Assigned Responsibilities

The backend, the PayPal money flows, the database, and infrastructure and deployment:

- Architecture and API design
- Authentication and authorization
- PayPal money flows
- Database and concurrency
- Reliability, logging and monitoring
- Backend performance and scalability
- Backend security
- Infrastructure and deployment
- Backend testing

Ravi's AI internals (`integrations/llm/`, the extract, agent, agentTools and aiBudget services, the prompts) were reviewed only at their HTTP routes, ownership checks and rate limits. Plus my section of each of the seven judge files.

## Total Findings

27 backend findings, BE-001 to BE-027, in `review/backend/`. 9 judge-driven recommendations, J-MANVEER-001 to J-MANVEER-009, in `review/judges/`.

## Severity Distribution

- Critical: 0
- High: 2 (BE-001, BE-021)
- Medium: 7 (BE-002, BE-006, BE-008, BE-013, BE-022, BE-026, BE-027)
- Low: 11 (BE-003, BE-009, BE-010, BE-011, BE-012, BE-014, BE-015, BE-017, BE-019, BE-023, BE-024)
- Informational: 7 (BE-004, BE-005, BE-007, BE-016, BE-018, BE-020, BE-025)

No Critical issue was found: no path double-captures, captures in the release direction, or loses a hold. "Capture only when the decision is keep" holds in code and in two database triggers, and every lost reply keeps the share reserved until sync.

## Most Important Findings

1. **BE-001 (High), `paypal-money-flows.md`.** A 429 `RATE_LIMIT_REACHED` or a 401 on a capture is classified as a definite refusal. The share becomes `capture_failed`, the plan is blocked for good, and the other holds stay live. Proven with the project's own PayPal fake: `{"contract":"blocked","shares":{"A":"capture_failed","B":"held","C":"held","D":"held"}}`. The fix is small: treat 401, 408 and 429 like a call that never left (same key, retried on the next resolve).
2. **BE-021 (High), `infrastructure-and-deployment.md`.** CI names the image after the repository. After the 11 November rename, new images go to a new GHCR path while the Mac keeps pulling the old one. That pull succeeds, so deploys stop with no error. Pin the image name before renaming.
3. **BE-002 (Medium).** After any capture refusal mid-wave, nothing can release the remaining holds. Proven: `{"A":"kept","B":"capture_failed","C":"held","D":"held"}`, and every later resolve answers `409 capture_refused`. This contradicts the landing page's "Kept or released. Never in between."
4. **BE-022 (Medium).** A rollback after a deploy that added a migration cannot start the old backend. `migrationsCurrent` treats a newer applied migration as a checksum failure. Proven: `true` → `false`.
5. **BE-013 and BE-006 (Medium).** Guest sign-in is limited to 5 per IP per day, and the whole demo to 200 plans counting every member's plans. Both can block judges.
6. **BE-008 (Medium).** No `/metrics` and no tracing, although the spec, the p95 budgets and the runbook rely on them. Production `/metrics` answers 404, so nothing is exposed.
7. **BE-026 and BE-027 (Medium).** A few money paths are untested, including recovering a lost capture that PayPal did complete, and the 5-holder lock cap. The PayPal fake replays a script and no real sandbox run of the edge cases is recorded.

## Judge Evaluations Completed

Scores use the shared rubric (Technological Implementation, Design, Potential Impact, Innovation/Idea, Presentation).

- Jo Franchetti: complete. 4 / 4 / 3 / 4 / 2, average 3.4.
- Eddie Jaoude: complete. 4 / 4 / 3 / 4 / 2, average 3.4.
- Marco Podien: complete. 4 / 4 / 3 / 4 / 2, average 3.4.
- Karthik Ravi: complete. 4 / 4 / 3 / 4 / 2, average 3.4.
- Himraj Singh: complete. 4 / 4 / 3 / 4 / 2, average 3.4.
- Nathaniel Olson: complete. 4 / 4 / 3 / 4 / 3, average 3.6.
- Mats Bryntse: complete. 4 / 4 / 3 / 4 / 3, average 3.6.

Presentation is 3 rather than 2 only where the lens weighs the landing page and board over the README and video.

## Most Important Recommendations

In order:

1. **Before the rename on 11 November:** pin the image name in `ci.yml`, `compose.yml` and `deploy.sh`, and update `BACKEND_IMAGE` on the Mac (J-MANVEER-002, BE-021). Then check that `/api/health` reports the new commit.
2. **Before 12 November:** fix BE-001 with a test (J-MANVEER-001). It is a few lines in `client.ts` and `resolve.service.ts`, but it is a money diff, so it needs the second review pass and a human review.
3. **Before 12 November:** give judges a written path to a real sandbox hold and capture (J-MANVEER-006), inside Nishit's README guide (J-NISHIT-001).
4. **Before 1 December**, the judge-access checklist (J-MANVEER-003):
   - raise the guest limit (BE-013)
   - count plans against the 200 cap (BE-006)
   - add an uptime alert (BE-011)
   - renew the Bryntum trial (J-NISHIT-010)
   - pin `BACKEND_TAG` to one commit for 1 to 15 December (BE-010)
5. **When time allows:**
   - fix rollback across migrations (BE-022)
   - build the small `/metrics` or mark it future work (BE-008)
   - bring the spec in line with the code (BE-017)
   - add the BE-002 recovery or state the limit
   - add the BE-026 tests
   - record a sandbox run of the edge cases (BE-027, J-MANVEER-005)

## Skills, Plugins, and Connectors

| Tool/Skill/Plugin | Purpose | Installation Method | Status | Verification |
|---|---|---|---|---|
| Ponytail (`ponytail@ponytail` 5.3.3) | Keeps changes minimal; skills `ponytail-audit`, `ponytail-review`, `ponytail-debt` | Already installed (user scope) from the `ponytail` marketplace, source GitHub `DietrichGebert/ponytail`, commit `96608e0`. It adds a SessionStart hook with the "smallest complete change" rules and a local task ledger (`~/.config/ponytail/band/`). The webhook is empty, so nothing leaves the machine. | Enabled and loaded | The SessionStart hook fired. `ponytail:ponytail-debt` ran on `backend/` and `deploy/`: 0 `shortcut:` markers, clean ledger |
| `claude-security` 0.12.0 | Deep security scan of the repository | `claude plugin install claude-security@claude-plugins-official` (Anthropic's official marketplace), approved by Manveer | Installed and enabled; **not loadable in this session** | Invoking it returned `Unknown skill: claude-security:claude-security`. Its README says a plugin reload is required. Not run, so no finding depends on it |
| `pr-review-toolkit` 1.0.1 | Silent-failure, test-gap and type-design review agents | `claude plugin install pr-review-toolkit@claude-plugins-official`, approved by Manveer | Installed and enabled; **not loadable in this session** | Its agents are not in this session's agent list until a reload. Not run |
| Built-in `/code-review`, `/security-review`, `/simplify` | Diff review | Built into Claude Code | Available | Not run: they review a diff, and this audit changed no code |
| Node.js 24.22.2 (portable) | Run the gates on the required engine (`engines: >=24`; the machine has Node 20.14) | Official `win-x64` zip from nodejs.org, SHA-256 matched `SHASUMS256.txt`, unpacked in the session scratchpad only, approved by Manveer | Working | `node --version`, then every gate ran |
| Docker Desktop 27.4.0, Compose 2.31 | Throwaway Postgres for the integration tests | Pre-installed; started by Manveer | Working | `foldback-review-postgres-test-1` healthy on 5433; removed with `down -v` |
| `yarn npm audit` | Dependency vulnerabilities | Project tooling | Working | "No audit suggestions" at `--severity high` |
| Built-in browser (Claude desktop) | Use the live app for the judge evaluations | Built in | Working | Guest session (Manveer clicked "Try it as a guest"), board, one assistant question, one pay link |
| `curl` | Read-only header and route checks on the production API | System | Working | 3 GETs and 1 OPTIONS preflight |
| MCP connectors present but not used | Cloudflare Developer Platform, Vercel, Firecrawl, Google Drive, Gmail, Google Calendar, Claude Docs | Already connected | Not used | Cloudflare and Vercel would touch production configuration, which is off limits for this audit; the others were not needed |

No other third-party tool was installed.

## Files Created

- `review/backend/architecture-and-api.md`
- `review/backend/auth.md`
- `review/backend/paypal-money-flows.md`
- `review/backend/database-and-concurrency.md`
- `review/backend/reliability-and-observability.md`
- `review/backend/performance-and-scalability.md`
- `review/backend/security.md`
- `review/backend/infrastructure-and-deployment.md`
- `review/backend/testing.md`

Temporary, deleted before finishing: `backend/test/integration/zz-audit-temp.test.ts`, the probe for BE-001, BE-002 and BE-022. Outside the repository: Node 24 and the test log in the session scratchpad, and the two plugins in the user's Claude Code config.

## Files Modified

- `review/reports/manveer.md` (this file, replacing its placeholder)
- My section of each judge file, replacing only its `_Pending._` line:
  - `review/judges/jo-franchetti.md`
  - `review/judges/eddie-jaoude.md`
  - `review/judges/marco-podien.md`
  - `review/judges/karthik-ravi.md`
  - `review/judges/himraj-singh.md`
  - `review/judges/nathaniel-olson.md`
  - `review/judges/mats-bryntse.md`

No application code, `deploy/`, `.github/`, `docs/spec/`, other makers' folders, or `review/README.md` was changed. Nishit owns `review/README.md`; please ask him to set the `backend/*.md`, `reports/manveer.md` and Manveer judge-section rows to Complete.

## Testing and Verification

Git:

- `git status` (clean) and `git branch --show-current` (`main`)
- `git fetch origin`, then `git pull --ff-only` (`5f72725..196f4f9`)
- `git log -1` equals `origin/main`
- `git switch -c review-manveer`

Gates, in `backend/`, with Node 24.22.2 and Yarn 4.9.2 through Corepack:

- `corepack yarn install`
- `format:check`, `typecheck`, `lint`, `knip`: all pass
- `dup`: pass (1 clone, 0.11 %)
- `build`: pass
- `sync-types --check`: pass
- `npm audit --severity high`: no suggestions

Tests:

- Database: `docker compose -p foldback-review -f deploy/compose.dev.yml up -d`. The `postgres-test` service started on 5433. The dev `postgres` service could not bind 5432, which another project on this machine uses; the tests do not need it.
- Environment: `TEST_DATABASE_URL=postgres://foldback:foldback@localhost:5433/foldback_test`, checked to point at 5433. No `backend/.env` exists.
- `corepack yarn test --coverage`: 38 suites, 504 tests, all pass. That is 500 project tests plus 4 probe tests. Coverage: `domain` 99.52 % lines, `services` 96.19 % lines, all files 97.06 % lines and 86.97 % branches.
- The probe was re-run alone with `--verbose` to read its output, then deleted. `git status` was clean afterwards.

Cleanup: `docker compose -p foldback-review -f deploy/compose.dev.yml down -v`. Container, volume and network removed; 0 `foldback-review` containers or volumes remain.

Production (read-only, minimal):

- Live app, as a guest Manveer created: the landing page, the plans list, the Cabin weekend board, one assistant question (one paid turn), and Maya's pay link.
- `curl` GET of `/api/health`, `/metrics` and `/health/ready`, and one OPTIONS preflight from a foreign origin.
- No load, no writes besides the guest session and its seeded samples, no containers or database touched.

Review categories:

| Category | State |
|---|---|
| Architecture and API | Complete |
| Authentication and authorization | Complete |
| PayPal money flows | Complete against the fake; real sandbox behaviour not verified |
| Database and concurrency | Complete for the races listed; no lock-contention load test |
| Reliability, logging and monitoring | Complete by reading; no real process kill or Postgres outage run |
| Performance and scalability | Complete by reading; no load test (production off limits) |
| Security | Complete by reading; no automated scanner ran (plugins not loadable) |
| Infrastructure and deployment | Complete for the repository files; the Mac's live config, tunnel config, backups and restore runs not inspected |
| Testing | Complete |

## Remaining Issues

Not verified:

- **Real PayPal behaviour.** Every money conclusion was checked against the scripted fake: key replay, 429 bodies, voids of captured authorizations, capture after expiry (BE-027).
- **A real process kill mid-wave and a real Postgres outage.** The conclusions in BE-009 and BE-010 come from reading the code.
- **Production state.**
  - the plan count against the 200 cap (BE-006)
  - `TRUST_PROXY` behaviour behind `cloudflared`, where real client IPs were not observed
  - whether `restore.sh check` has been run
  - whether CodeQL runs (BE-025)
- **The two newly installed plugins.** Neither ran (see the tools table).
- **Spec-versus-code disagreements**, reported for the spec owners in BE-017, not resolved here: BE-003, BE-008, BE-014, BE-016 and BE-022.

## Recommended Next Steps

1. Manveer and Anuj, before the rename: BE-021.
2. A backend fix branch for BE-001, with the second review pass and a human review because it touches money. BE-022 and BE-023 can follow in small separate diffs.
3. Nishit: merge J-MANVEER-006 (judge path to a real hold) into the README guide. Also see BE-002's copy conflict on the landing page.
4. Ravi: confirm the sample chat's reading stays cached (24 hours by text and paste time), so the judge path costs at most one paid model call a day. Cross-check BE-017 item 2, the order of the model chain.
5. Mac owner, before 1 December: the judge-access checklist in J-MANVEER-003.
6. Reload plugins (or start a new session) and run `claude-security` on the backend once, then add anything new as BE-028 onward.
7. After all three reviews: the Consolidated Observations in each judge file.
