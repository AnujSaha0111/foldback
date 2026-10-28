# Phase 3 — Backend foundation and first deploy

Budget: 10 hours. Hats: Backend and Ops. Depends on phase 1. Dates: 31 October – 2 November 2026.

## Read

- `architecture.md`: Stack, Backend layout, Security, Abuse and cost limits, Observability
- `api.md`: Access, Codes, Auth, Health and demo, Realtime, List and read
- `data-model.md`: Seeds, Reset, Guest cleanup
- `deploy.md`: all of it
- `test.md`: phase 3 cases

## Goal

A production-shaped backend with auth and seeds, running behind HTTPS on the Oracle VM, deployed by CI. It has no business features yet.

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
backend/scripts/sync-types.ts
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
7. Oracle VM (`deploy.md`, steps 1–7), Caddy, DuckDNS. CI deploys to the VM, and `smoke.sh` passes.

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
