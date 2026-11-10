# Phase 3 — Backend foundation and first deploy

Budget: 10 hours. Hats: Backend and Ops. Depends on phase 1. Dates: 31 October – 2 November 2026.

## Read

- `architecture.md`: Stack, Backend layout, Security, Abuse and cost limits, Observability
- `api.md`: Access, Codes, Auth, Health and demo, Realtime, List and read
- `data-model.md`: Seeds, Reset, Guest cleanup
- `deploy.md`: all of it
- `test.md`: phase 3 cases

## Goal

A production-shaped backend with auth and seeds, running on the Mac mini with its Postgres container, served over HTTPS at `api.<domain>` through a Cloudflare Tunnel, and deployed by pulling CI images. It has no business features yet.

## Create

```text
backend/src/server.ts  backend/src/app.ts
backend/src/config/env.ts
backend/src/observability/{logger,requestContext,metrics,otel}.ts
backend/src/db/{pool,tx}.ts
backend/src/http/errors.ts
backend/src/http/middleware/{requestId,auth,originCheck,rateLimit,validate,errorHandler}.ts
backend/src/routes/{health,auth,contracts,demo}.routes.ts         (contracts: list and read only)
backend/src/controllers/{health,auth,contracts,demo}.controller.ts
backend/src/services/{auth,seed,contracts}.service.ts
backend/src/repositories/{users,contracts,shares,events}.repo.ts
backend/src/domain/statuses.ts
backend/src/realtime/{io,notify}.ts
backend/src/shared/{api-types,statuses,rules}.ts
backend/scripts/sync-types.ts  backend/src/cli/{migrate,housekeeping}.ts
backend/Dockerfile  backend/.env.example
deploy/compose.yml  deploy/env.production.example  deploy/postgres-init.sh
deploy/scripts/{lib,deploy,smoke,backup,restore,housekeeping,stack-up}.sh
deploy/launchd/com.foldback.{colima,stack,deploy,backup,housekeeping}.plist
.github/workflows/ci.yml
backend/test/integration/{auth,contracts-read,limits-basic,health}.test.ts
```

Dependencies: `express@^5`, `socket.io@^4`, `pg`, `zod@^4`, `jsonwebtoken`, `bcrypt`, `cookie-parser`, `helmet`, `cors`, `express-rate-limit`, `winston`, `prom-client`, `dotenv`, `luxon`, `@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/instrumentation-{http,express,pg}`, and their `@types`.

## Order of work

1. Env, logger, request context, error handler, health. Tests are green.
2. Pool and transaction helpers, `withContractLock`.
3. Auth: signup, login, guest, logout, me, the cookie, the guard, Origin check, and rate limits. Seeds on signup and guest. Reset. Guest sweep.
4. Contracts list and read, ownership-scoped.
5. Socket.IO: handshake, `contract:join` ownership check, `notify` after commit.
6. Quality tooling from `quality.md` §7: Prettier, the ESLint rule set, knip, jscpd, husky + lint-staged (including the commit-msg check), gitleaks, Dependabot, and the `enableScripts: false` Yarn config. Then the Dockerfile, CI (all backend gates plus the security job), and multi-arch images to ghcr.io.
7. Mac mini (sub-phase 3f, `deploy.md`): remote access over Tailscale, the `foldback` account, Colima, then the Compose stack, the Cloudflare Tunnel for `api.<domain>`, the launchd jobs (pull-based deploys, backups, housekeeping), a restore check, a rollback, and a reboot test. `smoke.sh` passes from outside.

## Database and review obligations

In production the database is the `postgres` service in `deploy/compose.yml`, and `deploy/postgres-init.sh` creates `foldback_app` before the first migration. In code:

- Two connection strings: `DATABASE_URL` (role `foldback_app`) for the app, `MIGRATE_DATABASE_URL` (owner) for `migrate` and housekeeping jobs.
- `withContractLock` releases with `pg_advisory_unlock` on the same client in `finally`. The authorize route takes the lock too. Each money transaction begins with `SELECT 1 FROM contracts WHERE id = $1 FOR UPDATE`.
- Store only a redacted PayPal response (drop `payer` and `purchase_units[].shipping`). `ai_usage.ip_hash` is an HMAC keyed with `IP_HASH_SALT`. Omit `ai_usage.day` (the database sets it).
- Guest cleanup uses the "skip guests with live money" query in `data-model.md`. Reset returns `409 live_money` when the schema refuses it.
- A daily job (owner role) deletes `ai_usage` rows older than 90 days.
- Treat bigint ids (`events.id`, `ai_usage.id`) as strings.
- Add a test that keeps the status lists in the CHECK constraints and the transition tables in sync.

## Do not

- Build the extraction, PayPal, resolve, or agent logic.
- Put SQL anywhere except repositories, or transactions anywhere except services.
- Log a password, token, cookie, or secret.

## Exit check

- [x] Phase 3 cases pass. `yarn typecheck` and `yarn lint` are clean. CI is green.
- [x] `https://api.{domain}/api/health` shows the commit sha of the image the Mac pulled from CI.
- [x] Guest sign-in on production returns two sample plans.
- [x] `learn/05-backend-foundation.md` is written.

## Exit note

Domain: `api.foldback.tech` (the frontend will be `app.foldback.tech` on Vercel). Cloudflare Tunnel from the Mac mini, run by Manveer.

CI run URL: https://github.com/AnujSaha0111/foldback/actions/runs/40939549867 (merge of the 3f deploy PR). `/api/health` on production reported commit `bc5aae5` on 30 Oct 2026. Manveer also tested rollback, backup and restore, three reboots, and a foreign-origin request (403).
