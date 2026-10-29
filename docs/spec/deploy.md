# Deploy and infrastructure

The application runs on **one Azure VM** (Docker Compose: Caddy, a one-shot migrate job, the backend, and the frontend). **The database is not on the VM.** It is **Azure Database for PostgreSQL – Flexible Server**, a separate managed service in a different Azure account. One domain, HTTPS, paid from the team's student credits, and it stays up through judging (1 to 15 December 2026, so about seven weeks from now).

The work is split across three student Azure accounts so no single credit has to cover everything. Credits do not pool: each account's credit pays only for resources created inside that account.

## Environments

| Env | Where | Database | Notes |
|---|---|---|---|
| dev | your machine | `deploy/compose.dev.yml` → `postgres:16` on 5432 | `yarn dev` in `backend/` and `frontend/`. Next.js rewrites `/api` and `/socket.io` to `localhost:8787`, so dev is same-origin like prod |
| test | your machine and CI | `postgres:16` on 5433 (tmpfs) | Integration tests migrate a fresh schema per run |
| production | Azure VM (app, account B) + Azure Postgres Flexible Server (data, account A) | reached by `DATABASE_URL` over TLS | `deploy/compose.yml` |

## Accounts and ownership

| Account | Credit | Holds | Why |
|---|---|---|---|
| **A** (project lead, about ₹8,000) | student credit | Azure Database for PostgreSQL Flexible Server, plus a budget alert | The database is the cheapest part (roughly ₹3,000 to 3,500 for 10 weeks) |
| **B** (teammate, about ₹10,000) | student credit | The production VM, its disk, the static public IP, and the DNS name | The VM is the biggest cost (roughly ₹8,000 to 9,500 for 10 weeks) |
| **C** (teammate, about ₹10,000) | student credit | **Scale-out spare**: a second identical VM, only if measurements show one VM is not enough | Keeps the main deployment simple and the spare ready |

Before building, each owner checks, in the portal under Cost Management, **when the credit expires** (a 30-day free-trial credit would not last until 15 December; a student credit lasts 12 months) and sets a **budget alert** at about 70% of the credit.

The database lives outside the application deployment on purpose. The backend reads one connection string, so replacing or duplicating the VM never touches the data.

**Oracle's free databases were ruled out.** Always Free gives two *Oracle* Autonomous Databases and one MySQL system. Foldback's guarantees are written in PostgreSQL (PL/pgSQL triggers, partial unique indexes, `citext`, jsonb, advisory locks), so those databases cannot host the schema. Oracle's VM capacity was also unavailable. A free Neon database remains the no-card fallback if an Azure student policy blocks Flexible Server.

## Database setup (account A)

1. Portal, Azure Database for PostgreSQL Flexible Server, Create. Version **16**, workload **Development**, compute **Burstable B1ms**, storage **32 GiB**, backup retention 7 days (the default), same **region** as the VM. Choose a region your student subscription allows (try the VM region list first).
2. Authentication: PostgreSQL authentication. The admin login you create becomes the **owner role** (`MIGRATE_DATABASE_URL`).
3. Networking: **public access** with firewall rules. Allow only the VM's static public IP (add your own IP temporarily while you create the roles, then remove it). TLS is required by default. Use port **5432** (the direct connection). Do **not** use the built-in PgBouncer on 6432, because session-level advisory locks break under transaction pooling.
4. Server parameters: set `azure.extensions` to include `CITEXT` (the migration runs `CREATE EXTENSION IF NOT EXISTS citext`).
5. Create the database `foldback`, then as the admin: `CREATE ROLE foldback_app LOGIN PASSWORD '<random>';`.
6. Put the owner URL in `MIGRATE_DATABASE_URL` and the app URL in `DATABASE_URL` on the VM (`/opt/foldback/.env`, mode 600), both with `sslmode=require`.
7. Run `migrate` (the `migrate` container does this on every deploy). It creates every object and grants DML to `foldback_app`.
8. Backups: Flexible Server keeps 7 days of automatic backups. Also run `backup.sh` (`pg_dump`) daily from the VM to `/opt/foldback/backups`, using `postgresql-client-16`.
9. Application pool size 10 or less, statement timeout 5 s, and connection retry on a transient failure.

## Environment variables (backend)

Every variable is parsed by `config/env.ts` (zod). Boot fails on a missing or invalid value, and the error names the variable. The PayPal and AI variables are listed in `paypal.md`.

| Variable | Example / default | Notes |
|---|---|---|
| `NODE_ENV` | `production` | `development`, `test`, or `production` |
| `PORT` | `8787` | |
| `DATABASE_URL` | `postgres://foldback_app:…@<host>/foldback?sslmode=require` | The application role (DML only). Use the provider's **direct** endpoint, not a pooled one (session advisory locks) |
| `MIGRATE_DATABASE_URL` | `postgres://<owner>:…@<host>/foldback?sslmode=require` | The owner role. Used only by `migrate`, tests, and housekeeping jobs. Never given to the backend container |
| `JWT_SECRET` | 64 random bytes, base64 | At least 32 bytes, otherwise boot fails |
| `CORS_ORIGINS` | `https://foldback.<region>.cloudapp.azure.com` | Comma list. Also used by the Origin check |
| `APP_BASE_URL` | `https://foldback.<region>.cloudapp.azure.com` | PayPal return URLs |
| `TRUST_PROXY` | `1` | One proxy hop (Caddy) |
| `LOG_LEVEL` | `info` | |
| `METRICS_TOKEN` | random | Bearer token for `/metrics` from outside the Compose network |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | unset | Set it to turn on tracing |
| `SIGNUPS_ENABLED` | `true` | Kill switch |
| `GIT_SHA` | set by CI | Shown in `/api/health` |

Frontend: `API_INTERNAL_URL=http://backend:8787`, used only for server-side fetches inside Compose. Browser code uses relative `/api`.

Templates: `backend/.env.example` (dev) and `deploy/env.production.example` (prod), with every key and empty secrets. Real `.env` files are never committed.

## Docker images

Both Dockerfiles are multi-stage, with targets `deps → build → runtime` plus a `dev` target. The runtime stage:

- uses `node:24-bookworm-slim`
- runs as the non-root `node` user
- has production dependencies only
- sets `NODE_ENV=production`
- has a `HEALTHCHECK` (`/health/live` for the backend, `/` for the frontend)
- uses `tini` (or `--init`) for signal handling

The backend runs `node dist/server.js`. The frontend uses Next.js `output: "standalone"` and runs `node server.js`.

Images are built for `linux/amd64` (the Azure VM and every developer machine) with Buildx, then pushed to GitHub Container Registry:

- `ghcr.io/{owner}/foldback-backend:{sha}` and `:main`
- `ghcr.io/{owner}/foldback-frontend:{sha}` and `:main`

If Bryntum's registry needs a token, it is a build secret (`RUN --mount=type=secret,id=npmrc`), never an `ARG` or a layer.

## Production Compose (`deploy/compose.yml`)

```text
caddy     caddy:2.11      ports 80, 443 → reverse proxy; volumes caddy_data, caddy_config
migrate   backend image   command: node dist/cli/migrate.js migrate (uses MIGRATE_DATABASE_URL); restart: "no"
backend   backend image   depends_on migrate completed_successfully; healthcheck /health/ready; restart unless-stopped
frontend  frontend image  depends_on backend healthy; restart unless-stopped
postgres  postgres:16     optional fallback only (compose profile `local-db`): no public port, volume pgdata.
                          Not started in production while a managed database is in use
```

Every service has a memory limit and json-file log rotation (`max-size: 10m`, `max-file: 3`).

`deploy/Caddyfile`:

```text
{$DOMAIN} {
  encode zstd gzip
  header Strict-Transport-Security "max-age=31536000; includeSubDomains"
  @api path /api/* /socket.io/* /health/*
  reverse_proxy @api backend:8787
  reverse_proxy frontend:3000
}
```

Caddy gets and renews the Let's Encrypt certificate, redirects HTTP to HTTPS, proxies WebSockets, and forwards `X-Request-Id`. `/metrics` is not routed publicly.

## Azure VM setup (account B, Phase 3, so deploys start early)

1. Create a resource group `foldback-app` in the chosen region.
2. Create the VM: image **Ubuntu Server 24.04 LTS (x64)**, size **Standard B2s** (2 vCPU, 4 GB) or a similar B-series, **Standard SSD 64 GB**, authentication **SSH public key**, admin user `azureuser`. Turn **auto-shutdown off**.
3. Public IP: **Standard SKU, static**, with a **DNS name label**, for example `foldback`. That gives a free domain, `foldback.<region>.cloudapp.azure.com`, and no DuckDNS is needed. Set `DOMAIN` to that name.
4. Network security group, inbound rules: **22** (SSH) from your team's addresses only, **80** and **443** from anywhere. Nothing else.
5. SSH in, then install Docker Engine and the Compose plugin (Docker's official apt repository), and add the user to the `docker` group. Turn off password SSH. Ubuntu on Azure has no extra host firewall to open.
6. Add each teammate's SSH **public** key to `~/.ssh/authorized_keys`. Never share the private key.
7. `docker login ghcr.io` with a read-only token, copy `deploy/` to `/opt/foldback`, fill in `/opt/foldback/.env` from `env.production.example`, then `docker compose up -d`.
8. Give account A's database the VM's static IP in its firewall (see Database setup).
9. Run `deploy/scripts/smoke.sh https://<domain>`.

## Scale-out playbook (account C, only if measurements require it)

One VM is the plan for judging. Scaling out is documented, not built. The backend is already stateless and the database is external, so a second instance is mostly infrastructure. Do it only if a load test shows CPU above about 70% or p95 latency above the target in `quality.md`.

Code changes needed first (small, each behind an existing interface):

- A **Redis adapter for Socket.IO**, so board updates reach clients connected to either instance (a free hosted Redis such as Upstash works).
- A **shared store for rate-limit counters** (the same Redis).
- **Sticky sessions** for Socket.IO, or WebSocket-only transport.
- A **singleton guard** for housekeeping jobs, using `pg_try_advisory_lock`, so only one instance runs them (they are idempotent, so this is an optimization).

Already safe across instances because they live in Postgres: the contract advisory lock, the unique indexes, the guard triggers, the AI call cap, and the extraction cache.

Infrastructure:

1. In account C create an identical VM (same image, size, `.env`). Add its static IP to the database firewall in account A.
2. Azure's load balancers cannot span subscriptions, so front both VMs with **Caddy on VM B**: `reverse_proxy` to the local backend and to VM C's backend, with an IP-hash or cookie policy for stickiness.
3. Connect B and C privately with **VNet peering across subscriptions** (both owners approve it), so backend traffic does not cross the public internet. Without peering, restrict VM C's backend port to VM B's IP in its network security group and add a shared-secret header.
4. Deploys run `deploy.sh` on both hosts (CI loops over `DEPLOY_HOSTS`).

## Scripts (`deploy/scripts/`)

| Script | Does |
|---|---|
| `deploy.sh` | `docker compose pull && docker compose up -d --remove-orphans`, then `smoke.sh`. Exits non-zero on failure |
| `smoke.sh {url}` | checks `/health/live`, `/health/ready`, `/api/health`, guest sign-in, and listing plans returns 2 sample plans |
| `backup.sh` | `pg_dump -Fc` to `/opt/foldback/backups/foldback-{date}.dump`, keeps 7 days |
| `restore.sh {file}` | restores into a stopped backend, with a confirm prompt |
| `systemd/foldback-backup.{service,timer}` | runs `backup.sh` daily at 03:00 UTC |

## CI/CD (`.github/workflows/ci.yml`)

Runs on every push and pull request:

1. **backend** job: Node 24, `yarn install --immutable`, `yarn format:check`, `yarn typecheck`, `yarn lint`, `yarn knip`, `yarn dup` (jscpd), `yarn npm audit --severity high`, and `yarn test --coverage` with a `postgres:16` service container. Uploads coverage.
2. **frontend** job: Node 24, `yarn install --immutable`, `yarn sync-types --check`, `yarn format:check`, `yarn typecheck`, `yarn lint`, `yarn knip`, `yarn dup`, `yarn npm audit --severity high`, `yarn test`, `yarn build`, then **Lighthouse CI** (`lhci autorun` against `next start` with the stub API) using the budgets in `quality.md`.
3. **security** job: gitleaks over the full history. CodeQL runs through GitHub's default setup (enable it in repo Settings → Code security).
4. **images** job (only on `main`, after 1 and 2): Buildx build (`linux/amd64`) and push to ghcr.io, tagged with the commit sha and `main`.
5. **deploy** job (only on `main`, after 4, environment `production` with required reviewers optional): SSH to the Azure VM (`DEPLOY_HOST` and `DEPLOY_SSH_KEY` secrets) and run `deploy.sh`. The job fails if the smoke test fails.

Branch protection on `main` requires jobs 1–3. `.github/dependabot.yml` opens weekly grouped updates for `backend/`, `frontend/`, and GitHub Actions. The CI badge goes in the README.

## Operations

- **Logs:** `docker compose logs -f backend`, as JSON lines that include `requestId`.
- **Metrics:** `curl -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:8787/metrics` on the VM.
- **Rollback:** set `BACKEND_TAG` and `FRONTEND_TAG` in `.env` to a previous sha, then run `deploy.sh`.
- **Kill switches:** set `AI_ENABLED=false`, `PAYPAL_WRITES_ENABLED=false`, or `SIGNUPS_ENABLED=false` in `.env`, then `docker compose up -d backend`.
- **Backups:** verify one restore into a scratch database before submission (phase 9).
