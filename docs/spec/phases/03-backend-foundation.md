# Phase 3 — Backend foundation and first deploy

Budget: 10 hours. Hats: Backend and Ops. Depends on phase 1. Dates: 31 October – 2 November 2026.

## Read

- `architecture.md`: Stack, Backend layout, Security, Abuse and cost limits, Observability
- `api.md`: Access, Codes, Auth, Health and demo, Realtime, List and read
- `data-model.md`: Seeds, Reset, Guest cleanup
- `deploy.md`: all of it
- `test.md`: phase 3 cases

## Goal

A production-shaped backend with auth and seeds, running behind HTTPS on the Azure VM with the Azure Postgres database, deployed by CI. It has no business features yet.

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
deploy/compose.yml  deploy/Caddyfile  deploy/env.production.example
deploy/scripts/{deploy,smoke,backup,restore}.sh
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
7. Azure: the database in account A, then the VM in account B (`deploy.md`), Caddy, and the `cloudapp.azure.com` domain. CI deploys to the VM, and `smoke.sh` passes.

## Database and review obligations

Provision the Azure Postgres server first (`deploy.md` → Database setup). Then, in code:

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

- [ ] Phase 3 cases pass. `yarn typecheck` and `yarn lint` are clean. CI is green.
- [ ] `https://{domain}/api/health` shows the commit sha, from a CI deploy.
- [ ] Guest sign-in on production returns two sample plans.
- [ ] `learn/05-backend-foundation.md` is written.

## Exit note

Domain:

CI run URL:
