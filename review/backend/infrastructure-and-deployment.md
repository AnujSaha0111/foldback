# Infrastructure and deployment

Owner: Manveer. Reviewed on 10 November 2026 at commit `196f4f9`. Production (the Mac mini, `~/foldback/compose.yml`, `~/foldback/.env`, the running containers and the database) was not touched. Everything below comes from the repository files plus single read-only requests to `https://api.foldback.tech`.

Files read: `backend/Dockerfile`, `backend/.dockerignore`, `deploy/compose.yml`, `deploy/compose.dev.yml`, `deploy/postgres-init.sh`, `deploy/dev-init.sql`, `deploy/env.production.example`, every script in `deploy/scripts/`, every plist in `deploy/launchd/`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `docs/spec/deploy.md`.

## Verified as implemented

| Check | Evidence |
|---|---|
| Image | Multi-stage, `node:24-bookworm-slim`, production deps only via `yarn workspaces focus --production`, runs as `node`, `tini` as PID 1, healthcheck on `/health/live`, `GIT_SHA` baked in and served by `/api/health`. Production reports `version: 196f4f9…`, the current `main`. |
| Only CI-built images reach production | CI builds amd64, checks the modules load, and publishes amd64 + arm64 only on a push to `main`, after the backend, frontend and security jobs pass. `deploy.sh` never builds. |
| Tunnel exposure | The backend publishes `127.0.0.1:8787` only. Postgres publishes no port. `deploy.md` routes exactly one hostname through `cloudflared` and 404s the rest. Through the tunnel: `/metrics` is 404 (not built), `/health/ready` answers `{"status":"ok"}` and nothing else. |
| Least-privilege database roles | The migrate job and housekeeping get the owner password; the backend gets only `foldback_app` (`compose.yml` comments and env lists). |
| Migrations on deploy | One-shot `migrate` service, `depends_on: service_completed_successfully`. Checksums are verified, so an edited migration stops boot. |
| Deploy, smoke, rollback | `deploy.sh` pulls, compares image ids, tags the running image `previous`, runs compose, waits for the container health check, runs `smoke.sh` (live, ready, version equals the image's commit, `paypal_env` is `sandbox`, a guest gets two sample plans), and rolls back on failure, remembering the bad image. One run at a time (`take_lock`). |
| Backups | Daily `pg_dump -Fc` at 03:30, checked with `pg_restore --list`, 14-day retention, optional off-site copy encrypted with AES-256 and refused without a passphrase file. `restore.sh check` restores into a scratch database and counts rows. Whether `restore.sh check` has been run on the Mac could not be verified from here. |
| CI hygiene | Actions pinned to commit SHAs, `permissions: contents: read` by default, `packages: write` only on the image job, gitleaks over the whole history with a checksum-verified binary, `yarn npm audit --severity high`, `--immutable` installs, `concurrency` per ref. |

## [BE-021] Renaming the repository on 11 November will silently stop production deploys

- Category: Deployment / release process
- Severity: High
- Status: Missing (no rename step in `deploy.md`)
- File: `.github/workflows/ci.yml`, `deploy/compose.yml`, `deploy/scripts/deploy.sh`, `docs/spec/deploy.md`
- Code Location: `ci.yml:133` (`images: ghcr.io/${{ github.repository }}/backend`); `compose.yml:7` and `deploy.sh:15` (default `ghcr.io/anujsaha0111/paypal-hackathon/backend`)
- Description: CI derives the image name from the repository name. The Mac pulls a hard-coded name.
- Current Implementation: After the rename, the first push to `main` publishes to `ghcr.io/anujsaha0111/<new-name>/backend`, a new package that is private by default. The Mac keeps running `docker pull ghcr.io/anujsaha0111/paypal-hackathon/backend:latest`, which still succeeds (the old package stays), returns the same image id, and `deploy.sh:24` exits 0 without a log line.
- Problem: Every fix merged after the rename, including any fix for the findings in this review, stops reaching production, with no error anywhere. Separately, `compose.yml` and `deploy.sh` keep the words "paypal-hackathon" that the rename is meant to remove.
- Why It Matters: The rename lands one day before the submission deadline and three weeks before judging. A judge could test a build that is older than the team thinks.
- Recommended Solution: In one change, before the rename:
  1. Pin the image name in `ci.yml` (`images: ghcr.io/anujsaha0111/foldback/backend`, or whatever the new name is, lower-case), so it no longer follows `github.repository`.
  2. Change the defaults in `compose.yml:7` and `deploy.sh:15` to the same name.
  3. On the Mac (owner), set `BACKEND_IMAGE=` to the new name in `~/foldback/.env` and copy the updated `compose.yml` and scripts to `~/foldback`.
  4. After the first publish, make the new package public or confirm the Mac's `read:packages` token can pull it.
  5. Confirm `GET /api/health` reports the new commit.
  Add these steps to `deploy.md`.
- Implementation Complexity: Low
- Breaking Change Risk: Medium (a wrong name stops deploys until it is fixed; the check in step 5 catches it)
- Dependencies: Anuj (repository and package owner), the Mac owner. `.github/` and `deploy/` changes are outside this audit's write scope.
- Verification Method: After the rename, merge any small change and check that `/api/health` `version` matches the merge commit within 10 minutes.

## [BE-022] A rollback after a deploy that added a migration leaves the backend unable to start

- Category: Deployment / rollback
- Severity: Medium
- Status: Partially Implemented
- File: `backend/src/db/migrator.ts`, `backend/src/server.ts`, `deploy/scripts/deploy.sh`
- Code Location: `migrator.ts:175-178` (`migrationsCurrent`); `server.ts:20-24`; `deploy.sh:34-42` (`rollback`)
- Description: `deploy.sh` runs the new image's migrations before the new backend starts. If the new backend then fails its health check or smoke test, `rollback` starts the previous image.
- Current Implementation: The previous image does not have the new migration file. `migrationsCurrent` treats an applied migration with no matching file as a checksum failure, so it returns false, and `server.ts` exits with "migrations are not current". `restart: unless-stopped` then restarts it in a loop.
- Problem: Proven against the test database: `migrationsCurrent` returned `true`, then `false` after adding one ledger row for a migration the running code does not have (`migrationsCurrent before/after newer row: true false`). `deploy.md:163` says a rollback "restores the old backend, not the old schema"; in fact the old backend never starts, and the API is down until someone fixes it by hand.
- Why It Matters: Only two migrations exist today, so this has never happened. The first deploy that adds `0003_*` (BE-015 or BE-019 would) and then fails smoke turns a safe rollback into an outage.
- Recommended Solution: Let the backend accept migrations newer than it knows, and refuse only pending (unapplied) files and changed checksums of files it does have: in `migrationsCurrent`, skip applied rows whose file is missing, and log a warning. Keep `assertChecksums` strict for the `migrate` CLI. The rule that migrations are forward-only and additive (never drop or rename what the old code reads) makes this safe; write that rule into `data-model.md`.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: A migrator test: apply migrations from a directory with an extra file, then call `migrationsCurrent` with the original directory and expect `true`. Then rehearse `deploy.md` check B8 with a real extra migration on a test stack.

## [BE-023] `compose.yml` does not pass several variables that the env template says you can set

- Category: Configuration drift
- Severity: Low
- Status: Partially Implemented
- File: `deploy/compose.yml`, `deploy/env.production.example`
- Code Location: `compose.yml:56-80` (backend `environment`); `env.production.example` "Optional limits" block
- Description: The backend receives only the variables listed in its `environment` block. `AI_GLOBAL_PER_MIN`, `AI_USER_PER_MIN`, `AI_USER_PER_DAY`, `AI_IP_PER_MIN`, `AI_IP_PER_DAY`, `AGENT_PER_CONTRACT_PER_DAY`, `IP_HASH_SALT` and `LLM_CHAIN` are not in it.
- Current Implementation: The template documents the AI limits and `IP_HASH_SALT` as optional settings in `.env`.
- Problem: Setting them in `~/foldback/.env` has no effect, silently. In particular there is no way to change the model chain in production (for example, to take DeepSeek out once the $2 runs low) without editing `compose.yml`. Removing `DEEPSEEK_API_KEY` from `.env` does work.
- Why It Matters: During judging, these are the knobs you would reach for first.
- Recommended Solution: Add the eight variables with `${NAME:-}` (the env parser treats empty as unset, so defaults still apply).
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Copy the updated file to `~/foldback` (owner).
- Verification Method: `docker compose config` on the Mac shows the values; `/api/health` `ai_calls_left` follows a changed `AI_DAILY_CALLS`.

## [BE-024] Dependabot does not watch the frontend package

- Category: Supply chain
- Severity: Low
- Status: Partially Implemented
- File: `.github/dependabot.yml`
- Code Location: whole file (entries for `/backend` npm, GitHub Actions, and `/backend` Docker only)
- Description: `quality.md` §3 says Dependabot runs weekly, grouped, for both packages and GitHub Actions.
- Current Implementation: The frontend `npm` ecosystem has no entry, so Next.js, React, MUI and Socket.IO client updates and advisories get no pull requests. CI's `yarn npm audit --severity high` still runs on the frontend.
- Problem: Missing coverage for the larger dependency tree.
- Why It Matters: Low. Audit catches high and critical issues; Dependabot catches the rest and keeps upgrades small.
- Recommended Solution: Add an `npm` entry for `/frontend` with the same weekly grouping. `@bryntum/scheduler` is an npm alias of `@bryntum/scheduler-trial` (`frontend/package.json:23`), so consider ignoring `@bryntum/*` to keep the trial pin stable.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Nishit (frontend owner), since the pull requests land in his package.
- Verification Method: The Dependabot tab lists a frontend update run.

## [BE-025] No image scan, and CodeQL cannot run until the repository is public

- Category: Supply chain / CI
- Severity: Informational
- Status: Needs Verification
- File: `.github/workflows/ci.yml`, `docs/spec/quality.md`
- Code Location: `quality.md:122`, `:136` (CodeQL listed as a gate)
- Description: `quality.md` lists CodeQL (GitHub default setup, free for public repositories) as a CI gate. The repository is private until 11 November, and default setup is not in the workflow file, so whether it runs could not be checked from the clone. The published image is not scanned for OS package vulnerabilities.
- Current Implementation: gitleaks and `yarn npm audit` run on every push.
- Problem: One listed gate is not active today.
- Why It Matters: Low. Worth turning on the day the repository goes public, because public visitors can then see the Security tab.
- Recommended Solution: On 11 November, enable CodeQL default setup in the repository settings (Anuj). Optionally add an image scan step on the `image` job; it would need a new action, so weigh it against the time left.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Repository owner.
- Verification Method: The Security tab shows a CodeQL run on `main`.
