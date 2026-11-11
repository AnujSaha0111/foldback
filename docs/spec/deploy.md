# Deploy and infrastructure

The backend and its Postgres database run on **one Mac mini** (Apple M4) owned by a team member, under Docker Compose. The frontend runs on **Vercel**. Public traffic reaches the Mac through a **Cloudflare Tunnel**, so the home router opens no ports. Admin access is SSH over **Tailscale**. Everything is on free tiers.

The plan changed on 29 October 2026: the earlier Azure plan (VM, managed Postgres, Caddy, three student accounts) was dropped because the free cloud options did not work out.

```text
 Browser
   | https://app.<domain>                    https://api.<domain> (and Socket.IO)
   v                                          v
 Vercel (Next.js frontend)              Cloudflare (DNS + Tunnel, free)
                                              |  outbound-only tunnel
                                              v
                              +----------- Mac mini ------------+
                              |  cloudflared -> 127.0.0.1:8787  |
                              |  backend container (Node 24)    |
                              |  postgres:16 container, volume  |
                              |  daily backups (internal disk)   |
                              +---------------------------------+
   Team access to the Mac (admin only, never public): Tailscale + SSH keys
```

## Environments

| Env | Where | Database | Notes |
|---|---|---|---|
| dev | your machine | `deploy/compose.dev.yml` → `postgres:16` on 5432 | `yarn dev` in `backend/` and `frontend/`. The browser calls the API directly at `NEXT_PUBLIC_API_URL` (default `http://localhost:8787`; there are no rewrites) |
| test | your machine and CI | `postgres:16` on 5433 (tmpfs) | Integration tests migrate a fresh schema per run |
| production | Mac mini (backend + database), Vercel (frontend) | `postgres:16` container on the Mac, on the Compose network only | `deploy/compose.yml`, run from `~foldback/foldback` |

## Who owns what

| Piece | Owner | Notes |
|---|---|---|
| Mac mini, its macOS admin account, the Tailscale network it is on, server operations | Manveer | The Mac also holds the owner's personal data, so the owner is the only operator (see Remote access) |
| The domain, the Cloudflare account, the tunnel | Manveer | Creates the tunnel himself, so its token never leaves the Mac owner. Adds the DNS record Vercel asks for |
| Vercel project | Nishit | His Hobby account, deployed from the CLI (`frontend/`), no Git integration |
| GitHub repository and the ghcr.io package | Anuj | See Docker image |

## The Mac mini host

What is set up, and why. All of it was done over SSH, from a Windows laptop.

| Item | Setting | Why |
|---|---|---|
| Accounts | Owner's admin account, plus a **standard (non-admin) `foldback` account** that runs the stack | The stack never runs with admin rights. `foldback` cannot `sudo` and cannot read the owner's home folder (mode 700) |
| Auto-login | `foldback` | The stack and Docker start after a reboot or power cut with nobody at the keyboard |
| FileVault | Off | With FileVault on, every reboot waits for a password typed at the Mac, which takes the site down. The data is PayPal sandbox data and the Mac is in a private home |
| Sleep | `pmset`: `sleep 0`, `autorestart 1`, `womp 1` | Never sleeps, and starts again after a power failure |
| Firewall | macOS application firewall on | Nothing needs to come in: the tunnel and Tailscale are outbound-only |
| Tailscale | The **Homebrew `tailscaled` system daemon** (`/Library/LaunchDaemons/com.tailscale.tailscaled.plist`), not the menu-bar app | The app's tunnel drops whenever the app is not running in a logged-in session. The daemon connects at boot, before any login. Key expiry is disabled for the Mac in the Tailscale admin console |
| Docker | **Colima** (Homebrew `colima`, `docker`, `docker-compose`), 4 CPUs, 6 GB, 60 GB disk, under `foldback` | Installs and runs entirely from the command line, so no GUI step is needed on a machine far away. Started at login by `deploy/launchd/com.foldback.colima.plist` |
| Tunnel client | Homebrew `cloudflared`, a locally managed tunnel run by a launch daemon at boot (see Cloudflare Tunnel) | Runs on the host, not as a container: only images from `ghcr.io/anujsaha0111` and the official `postgres:16` run on the Mac |
| Code | No git clone with credentials on the Mac | The repository is private, so files reach the Mac by `git archive | ssh`. Production needs only the `deploy/` folder, copied to `~foldback/foldback` |

Gotcha: saving **System Settings → General → Sharing → Remote Login** rewrites the SSH allow-list from what that window shows, which drops `foldback`. Add Foldback there with **+**, or run `sudo dseditgroup -o edit -a foldback -t user com.apple.access_ssh`.

## Remote access

- **Owner only.** The Mac is reachable for administration only from the owner's own devices on the owner's Tailscale network, with SSH keys. Nobody else has an account, a key, or a Tailscale share. The team does not need one: merging to `main` deploys by itself (CI/CD below), and server problems go to the owner.
- **Public traffic never uses Tailscale.** Users and PayPal returns reach only `api.<domain>`, through the Cloudflare Tunnel, which forwards to the backend on `127.0.0.1:8787` and nothing else. Postgres, SSH, and the rest of the Mac are not reachable through it.
- **No inbound ports.** Port 22 and the app are never forwarded on the home router.
- **If another operator is ever needed:** share only the Mac in the Tailscale admin console (Machines → the Mac → Share; node sharing exposes that one machine), and append their SSH **public** key to `~foldback/.ssh/authorized_keys`. They get `foldback`, never admin.
- The owner keeps a private operations runbook with hostnames and commands. It is never committed, because the repository is public and the runbook names hosts and accounts.

## Environment variables (backend)

Every variable is parsed by `config/env.ts` (zod). Boot fails on a missing or invalid value, and the error names the variable. The PayPal and AI variables are listed in `paypal.md` and `ai.md`.

| Variable | Example / default | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Set by Compose |
| `PORT` | `8787` | Set by Compose |
| `DATABASE_URL` | `postgres://foldback_app@postgres:5432/foldback` | Set by Compose, with the password in `PGPASSWORD` (from `APP_DB_PASSWORD`), which the `pg` driver reads; no URL in the repository carries a password. The application role (DML only). A direct connection: session advisory locks do not survive a transaction pooler |
| `MIGRATE_DATABASE_URL` | `postgres://foldback@postgres:5432/foldback` | Set by Compose, with `PGPASSWORD` from `POSTGRES_PASSWORD`. The owner role. Given only to the `migrate` service (which housekeeping reuses), never to the backend |
| `JWT_SECRET` | 48 random bytes, base64 | At least 32 characters, otherwise boot fails |
| `CORS_ORIGINS` | `https://app.<domain>` | Comma list. Also the Origin check's allow-list |
| `APP_BASE_URL` | `https://app.<domain>` | PayPal return URLs |
| `COOKIE_DOMAIN` | `.<domain>` | The session cookie's domain, so `app.` and `api.` share it (same site) |
| `TRUST_PROXY` | `1` | Set by Compose: one hop, the tunnel client |
| `LOG_LEVEL` | `info` | |
| `METRICS_TOKEN` | random | Bearer token for `/metrics` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | unset | Set it to turn on tracing |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | sandbox REST app | Without them the app runs and checkout stays closed |
| `PAYPAL_WRITES_ENABLED` | `true` | Kill switch for checkout and authorize |
| `PAYPAL_TIMEOUT_MS` | `15000` | A call that takes longer counts as unknown |
| `SIGNUPS_ENABLED`, `AI_ENABLED`, `AI_DAILY_CALLS` | `true`, `true`, `600` | Kill switches and caps |
| `AI_GLOBAL_PER_MIN`, `AI_USER_PER_MIN`, `AI_USER_PER_DAY`, `AI_IP_PER_MIN`, `AI_IP_PER_DAY` (optional) | `12`, `6`, `30`, `10`, `60` | AI limits from `ai.md`. Leave unset to use these defaults. `compose.yml` must list a variable before setting it in `.env` has any effect |
| `GIT_SHA` | baked into the image by CI | Shown in `/api/health`. Compose does not override it |

Templates: `backend/.env.example` (dev) and `deploy/env.production.example` (prod), with every name and no values. The real production file is `~foldback/foldback/.env`, mode 600, on the Mac only. Database passwords are hex (`openssl rand -hex 24`) so they are safe inside URLs.

## Docker image

`backend/Dockerfile` is multi-stage (`build`, `prod-deps`, `runtime`). The runtime stage uses `node:24-bookworm-slim`, runs as the non-root `node` user under `tini`, has production dependencies only, and has a `HEALTHCHECK` on `/health/live`. The server runs `node dist/server.js`; the same image runs `node dist/cli/migrate.js migrate` and `node dist/cli/housekeeping.js`.

CI builds it for `linux/arm64` (the Mac mini) and `linux/amd64`, and pushes `ghcr.io/anujsaha0111/paypal-hackathon/backend` with two tags: `:latest` (newest `main`) and `:sha-<full commit>` (for pinning and rollback).

**The image** holds the compiled backend code (readable, with comments) and the schema, but no secrets: every secret enters at runtime through the env file. Never build a secret, key, or real URL into the image. The Mac pulls it with a **classic GitHub token from the Mac owner's account that has only the `read:packages` scope** (fine-grained tokens cannot read packages), set to expire within 90 days. It was entered once with `docker login ghcr.io` as `foldback`, and lives only in `~foldback/.docker/config.json` (mode 600). If it leaks, delete it on GitHub (Settings → Developer settings → Tokens (classic)) and log in again with a new one. The package can be made public (GitHub profile → Packages → the backend package → Package settings → Change visibility).

Only CI-built images reach production. Never `docker build` on the Mac for production.

## Production Compose (`deploy/compose.yml`)

```text
postgres  postgres:16     no published port (Compose network only); volume pgdata; postgres-init.sh creates foldback_app
migrate   backend image   node dist/cli/migrate.js migrate, owner role; restart "no"; waits for postgres healthy
backend   backend image   waits for migrate to complete; healthcheck /health/ready; 127.0.0.1:8787; restart unless-stopped
```

Each service gets only its own variables (explicit `environment:`), every service has a memory limit, and logs rotate (`json-file`, `max-size: 10m`, `max-file: 3`).

**Ordering:** `0001_init.sql` grants table rights to `foldback_app` only if the role already exists. `deploy/postgres-init.sh` creates it when the volume is first created, before `migrate` runs. If the grants ever go wrong, ask the project lead before touching them by hand.

## Cloudflare Tunnel

The domain is on Cloudflare's Free plan. The tunnel is **locally managed** (created with `cloudflared` on the Mac), because the Zero Trust dashboard asks for payment details during onboarding even on its free plan. Tunnels themselves are free.

1. On the Mac, as the admin account: `cloudflared tunnel login` prints a link; the owner opens it in a browser, picks the domain, and authorizes. This writes a login certificate (`~/.cloudflared/cert.pem`).
2. `cloudflared tunnel create foldback-api`, then `cloudflared tunnel route dns foldback-api api.<domain>` (adds the CNAME in Cloudflare).
3. `/etc/cloudflared/config.yml` (root only, with the tunnel's credentials file beside it) routes exactly one hostname, and returns 404 for everything else:

   ```yaml
   tunnel: <tunnel id>
   credentials-file: /etc/cloudflared/<tunnel id>.json
   ingress:
     - hostname: api.<domain>
       service: http://localhost:8787
     - service: http_status:404
   ```

4. `sudo cloudflared service install` creates the launch daemon `/Library/LaunchDaemons/com.cloudflare.cloudflared.plist`, which starts at boot. **Gotcha:** on macOS the generated plist runs `cloudflared` with no arguments, so it never connects ("use cloudflared tunnel run"). Its `ProgramArguments` must be `cloudflared --no-autoupdate --config /etc/cloudflared/config.yml tunnel run`; reload it with `launchctl bootout system <plist>` and `launchctl bootstrap system <plist>`.
5. Delete the login certificate afterwards. The running tunnel needs only its credentials file, and the certificate can change DNS for the whole domain. To change the tunnel later, log in again, make the change, delete it again.
6. In the Cloudflare dashboard: SSL/TLS → Edge Certificates → **Always Use HTTPS** on, **Minimum TLS 1.2**. Plain HTTP then redirects (the session cookie is `Secure`), and TLS 1.0 and 1.1 are refused.

Check: `cloudflared tunnel info foldback-api` lists the connections, and `https://api.<domain>/health/live` returns 200. Socket.IO works through the tunnel.

## Frontend on Vercel

The frontend is deployed to a **Vercel Hobby project owned by Nishit**, from the CLI (`vercel deploy --prod`), and served at `app.<domain>`. The repository stays private, and Vercel's Git integration is not used, because Hobby blocks Git deploys of a private repo that has collaborators. **Always deploy from inside `frontend/`, and leave the project's Root Directory empty.** The CLI uploads the folder it runs in and does not read `.gitignore`, so a deploy from the repository root sends every local `.env` file. The root `.vercelignore` ignores everything, so that mistake uploads nothing. Vercel also reads `packageManager` from the top of what it receives, so this is what makes it use Yarn 4 and the lockfile instead of Yarn 1. `engines` pins Node to `24.x`, because a range such as `>=24` moves to the newest major. The project has `ENABLE_EXPERIMENTAL_COREPACK=1` and `NEXT_PUBLIC_API_URL=https://api.<domain>`. `frontend/vercel.json` redirects `foldback.vercel.app` to `app.<domain>`, the only address the API allows. A CI job runs the deploy once Anuj adds three repository secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`). `app.<domain>` is a DNS-only CNAME (Cloudflare proxy off), added by Manveer. There is no frontend Dockerfile. The browser calls the API at `https://api.<domain>` with credentials; the session cookie is set for `COOKIE_DOMAIN`, so both subdomains are the same site and `SameSite=Lax` holds. CORS allows only `CORS_ORIGINS`.

## First deploy (in order)

| Step | What you do | Result |
|---|---|---|
| B0 | As `foldback`, `docker login ghcr.io` with the read-only token, then `docker pull` of `:latest` | Image pulls on the Mac |
| B1 | As `foldback`, copy `deploy/` to `~/foldback` (a working folder, not a git clone) | Working folder |
| B2 | `umask 077`, create `~/foldback/.env` from `env.production.example`, generate the secrets on the Mac. Type shared values in with an editor, never into chat | Private env file |
| B3 | `cd ~/foldback && docker compose up -d` (postgres, then the role, then migrate, then the backend) | Containers healthy, migrations applied |
| B4 | Install the tunnel service (above) | Tunnel Healthy |
| B5 | `scripts/smoke.sh https://api.<domain> https://app.<domain>` | Health and guest sign-in pass from outside |
| B6 | Install the launchd jobs (below) | A new image on `main` reaches the Mac by itself |
| B7 | Run `scripts/backup.sh`, then `scripts/restore.sh check <dump>` | A backup exists and a restore has been tried |
| B8 | Set `BACKEND_TAG=sha-<previous commit>`, run `scripts/deploy.sh --force`, then set it back to `latest` and deploy again | The rollback path works |
| B9 | Reboot (with someone at home reachable) and confirm everything returns by itself | Auto-login, Docker, containers, Tailscale, tunnel all back |

## Scripts (`deploy/scripts/`)

All run as `foldback` from `~/foldback/scripts`, with macOS's bash 3.2. `lib.sh` holds the shared setup (PATH for launchd, reading `.env` without printing it, waiting for Docker, one run at a time).

| Script | Does |
|---|---|
| `deploy.sh [--force]` | Pulls the image named by `BACKEND_TAG`. If it differs from the running one: tags the running image `foldback-backend:previous`, runs `docker compose up -d` (migrate first), waits for the backend's health check, then runs `smoke.sh` with the image's commit. On failure it puts the previous image back and records the bad image in `.bad-image`, so the five-minute check does not retry it. Migrations are forward-only: a rollback restores the old backend, not the old schema |
| `smoke.sh <url> <origin> [sha]` | `/health/live` and `/health/ready` are 200, `/api/health` shows `paypal_env: sandbox` and the expected commit, and a guest sign-in (with an allowed `Origin`) gets two sample plans |
| `backup.sh` | `pg_dump -Fc` through `docker compose exec` into `BACKUP_DIR` (`~/foldback/backups` on the Mac's internal disk; there is no external disk, so these protect against bad data and bad deploys, not against losing the Mac), checked with `pg_restore --list`, older than `BACKUP_KEEP_DAYS` (14) removed. With `OFFSITE_DIR` set, an AES-256 encrypted copy goes there (a cloud-drive folder); it refuses to copy off the Mac unencrypted |
| `restore.sh check <dump>` | Restores into a scratch database, prints row counts, drops it. Safe at any time |
| `restore.sh production <dump>` | Asks you to type `restore foldback`, takes a safety backup, stops the backend, replaces the database, starts the stack |
| `housekeeping.sh` | `node dist/cli/housekeeping.js` in a throwaway `migrate` container (owner role) |
| `stack-up.sh` | Waits for Docker and runs `docker compose up -d`. A safety net: the containers also restart by themselves |

## launchd jobs (`deploy/launchd/`)

Per-user jobs for `foldback`, logging to `~foldback/Library/Logs/`.

| Label | When | Runs |
|---|---|---|
| `com.foldback.colima` | at login, kept alive | `colima start --foreground` |
| `com.foldback.stack` | at login | `stack-up.sh` |
| `com.foldback.deploy` | every 5 minutes | `deploy.sh` |
| `com.foldback.backup` | daily 03:30 (Mac time) | `backup.sh` |
| `com.foldback.housekeeping` | daily 04:15 (Mac time) | `housekeeping.sh` |

Install or update, as `foldback`:

```bash
cp ~/foldback/launchd/com.foldback.*.plist ~/Library/LaunchAgents/
for p in ~/Library/LaunchAgents/com.foldback.*.plist; do launchctl bootout gui/$(id -u) "$p" 2>/dev/null; launchctl bootstrap gui/$(id -u) "$p"; done
```

Homebrew's own `brew services` plists do not work for `foldback`: they log into Homebrew's folder, which belongs to the admin account, and launchd refuses to start them (exit 78).

## CI/CD (`.github/workflows/ci.yml`)

Runs on every pull request and on pushes to `main`:

1. **backend:** Node 24, `yarn install --immutable`, `format:check`, `typecheck`, `lint`, `knip`, `dup`, `sync-types --check`, `build`, `test --coverage` against a `postgres:16` service.
2. **security:** gitleaks over the whole history (checksum-verified binary), and `yarn npm audit --severity high`. CodeQL runs through GitHub's default setup.
3. **image** (after 1 and 2): builds the backend image and checks that its modules load. On pushes to `main` it publishes `linux/amd64` and `linux/arm64` to ghcr.io.
4. **frontend** (phase 5): every `quality.md` §7 gate plus Lighthouse CI. A later job deploys the frontend with the Vercel CLI (see Frontend on Vercel).

**Deploys are pull-based.** There is no deploy job and no self-hosted runner: the repository is public, and a self-hosted runner on a public repository can run a stranger's pull request on the Mac. The Mac's `com.foldback.deploy` job pulls each new `:latest` within five minutes.

`.github/dependabot.yml` opens weekly updates for `backend/` (npm and its Docker base image) and GitHub Actions.

## Operations

- **Status:** `cd ~/foldback && docker compose ps`
- **Logs:** `docker compose logs -f --tail 100 backend` (JSON lines with `requestId`); job logs in `~/Library/Logs/foldback-*.log`
- **Health:** `curl -s http://127.0.0.1:8787/health/ready`
- **Metrics:** not built yet. Use the request log (`ms`, `status`) and `/health/ready`
- **Deploy now:** `scripts/deploy.sh --force`
- **Rollback:** set `BACKEND_TAG=sha-<commit>` in `.env`, run `scripts/deploy.sh --force`. Set it back to `latest` to follow `main` again
- **A plan paused after a refused capture** (`capture_failed`, other shares still held): Foldback has no button for this yet. In the PayPal sandbox dashboard, void the authorizations of the shares still held, then tell the organizer. The plan stays paused in Foldback.
- **Kill switches:** set `AI_ENABLED=false` or `SIGNUPS_ENABLED=false` in `.env`, then `docker compose up -d backend`
- **After a power cut:** the Mac restarts, auto-logs in as `foldback`, Colima and the stack start, Tailscale and the tunnel reconnect. Check with `docker compose ps` and the smoke test
- **macOS updates:** never remotely. Do them with someone at home on the line, at a quiet time, and tell the team. Turn off automatic installation of macOS updates (System Settings → General → Software Update → Automatic Updates) so a surprise restart cannot take the demo down
- **Backups:** verify one restore into a scratch database before going live

## Limits and fallback

A home machine is less reliable than a cloud server: power, home internet, and reboots. The demo video is recorded before the deadline, because the video shows the product if the Mac is offline. If the Mac fails for good, the latest dump restores into any Postgres 16 (for example a free Neon database) and the same image runs on any Docker host; only `.env` and the tunnel's target change.
