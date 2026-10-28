# Deploy and infrastructure

One Oracle Cloud **Always Free** Ampere VM (ARM64) runs everything with Docker Compose: Caddy, Postgres, a one-shot migrate job, the backend, and the frontend. One domain, HTTPS, $0 per month, and it stays up through judging (15 December 2026).

## Environments

| Env | Where | Database | Notes |
|---|---|---|---|
| dev | your machine | `deploy/compose.dev.yml` → `postgres:16` on 5432 | `yarn dev` in `backend/` and `frontend/`. Next.js rewrites `/api` and `/socket.io` to `localhost:8787`, so dev is same-origin like prod |
| test | your machine and CI | `postgres:16` on 5433 (tmpfs) | Integration tests migrate a fresh schema per run |
| production | Oracle VM | `postgres:16` container with a named volume | `deploy/compose.yml` |

## Environment variables (backend)

Every variable is parsed by `config/env.ts` (zod). Boot fails on a missing or invalid value, and the error names the variable. The PayPal and AI variables are listed in `paypal.md`.

| Variable | Example / default | Notes |
|---|---|---|
| `NODE_ENV` | `production` | `development`, `test`, or `production` |
| `PORT` | `8787` | |
| `DATABASE_URL` | `postgres://foldback:…@postgres:5432/foldback` | |
| `JWT_SECRET` | 64 random bytes, base64 | At least 32 bytes, otherwise boot fails |
| `CORS_ORIGINS` | `https://foldback.duckdns.org` | Comma list. Also used by the Origin check |
| `APP_BASE_URL` | `https://foldback.duckdns.org` | PayPal return URLs |
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

Images are built for `linux/arm64` (the Oracle VM) and `linux/amd64` (local) with Buildx, then pushed to GitHub Container Registry:

- `ghcr.io/{owner}/foldback-backend:{sha}` and `:main`
- `ghcr.io/{owner}/foldback-frontend:{sha}` and `:main`

If Bryntum's registry needs a token, it is a build secret (`RUN --mount=type=secret,id=npmrc`), never an `ARG` or a layer.

## Production Compose (`deploy/compose.yml`)

```text
caddy     caddy:2.11      ports 80, 443 → reverse proxy; volumes caddy_data, caddy_config
postgres  postgres:16     no public port; volume pgdata; healthcheck pg_isready;
                          command tuned: shared_buffers=512MB, effective_cache_size=2GB, max_connections=50
migrate   backend image   command: node dist/scripts/migrate.js migrate; depends_on postgres healthy; restart: "no"
backend   backend image   depends_on migrate completed_successfully; healthcheck /health/ready; restart unless-stopped
frontend  frontend image  depends_on backend healthy; restart unless-stopped
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

## Oracle Cloud VM setup (phase 3, so deploys start early)

1. Create an Oracle Cloud account. Pick a home region with Ampere capacity; if "out of capacity" appears, try another availability domain or try again later. Do this on day one.
2. Create the instance: shape `VM.Standard.A1.Flex` with 2 OCPU and 12 GB (inside the free 4 OCPU / 24 GB), image Ubuntu 24.04 (aarch64), boot volume 50 GB, your SSH public key.
3. Networking: in the VCN security list, allow ingress TCP 80 and 443 from `0.0.0.0/0`, and 22 from your IP only. Oracle's Ubuntu images also ship host firewall rules, so open 80 and 443 there too (`iptables` + `netfilter-persistent save`).
4. Domain: a free DuckDNS subdomain (for example `foldback.duckdns.org`) pointing at the VM's public IP, or your own domain. Set `DOMAIN` in the env file.
5. Install Docker Engine and the Compose plugin. Create a `deploy` user in the `docker` group, and turn off password SSH.
6. `docker login ghcr.io` with a read-only token, copy `deploy/` to `/opt/foldback`, fill in `/opt/foldback/.env` from `env.production.example`, then `docker compose up -d`.
7. Run `deploy/scripts/smoke.sh https://{domain}`.

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
4. **images** job (only on `main`, after 1 and 2): Buildx multi-arch build and push to ghcr.io, tagged with the commit sha and `main`.
5. **deploy** job (only on `main`, after 4, environment `production` with required reviewers optional): SSH to the VM (`DEPLOY_HOST` and `DEPLOY_SSH_KEY` secrets) and run `deploy.sh`. The job fails if the smoke test fails.

Branch protection on `main` requires jobs 1–3. `.github/dependabot.yml` opens weekly grouped updates for `backend/`, `frontend/`, and GitHub Actions. The CI badge goes in the README.

## Operations

- **Logs:** `docker compose logs -f backend`, as JSON lines that include `requestId`.
- **Metrics:** `curl -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:8787/metrics` on the VM.
- **Rollback:** set `BACKEND_TAG` and `FRONTEND_TAG` in `.env` to a previous sha, then run `deploy.sh`.
- **Kill switches:** set `AI_ENABLED=false`, `PAYPAL_WRITES_ENABLED=false`, or `SIGNUPS_ENABLED=false` in `.env`, then `docker compose up -d backend`.
- **Backups:** verify one restore into a scratch database before submission (phase 9).
