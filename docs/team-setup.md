# Team setup

Welcome. This page gets you from zero to a working local copy of Foldback. Read it once, then read [docs/spec/README.md](spec/README.md) and [docs/spec/quality.md](spec/quality.md).

## The one rule about secrets

**Never put a key, password, or token in git, in a chat, in a screenshot, or in an issue.** Each person keeps their own keys in their own untracked `.env` file. All `.env` files are already gitignored. Share *instructions* for getting a key, never the key itself. If a secret leaks, see "If a secret leaks" at the bottom.

## 1. Access

1. Ask Nishit to add you as a collaborator on the GitHub repository (Write access).
2. Work on a branch, never directly on `main`. Name branches `phaseN-topic`, for example `phase3-auth`. Open a pull request into `main`. One concern per pull request.
3. Production runs on Manveer's Mac mini, and Manveer is its only operator. You never need access to it: merging to `main` deploys automatically within five minutes. For anything on the server (logs, a restart, a stuck deploy), ask Manveer. See [deploy.md](spec/deploy.md) → Remote access.

## 2. Install

| Tool | Why |
|---|---|
| Git | version control |
| Node.js 24 | runtime |
| Corepack (ships with Node), then run `corepack enable` | gives you Yarn 4, the version this repo pins |
| Docker Desktop, **or** GitHub Codespaces | runs the Postgres databases for development and tests |

Notes:

- The frontend dev server crashed one team laptop when it used Turbopack with the Bryntum library. Frontend scripts use `next dev --webpack`. If your machine struggles, use a Codespace (GitHub, Code, Codespaces, New codespace, pick a 4-core machine) and stop it when finished.
- Do not install packages that are not on the approved list in [quality.md](spec/quality.md). Ask first.

## 3. Accounts and keys each person creates (all free, no card)

| What | Where | Used for | Goes into |
|---|---|---|---|
| Gemini API key | aistudio.google.com/apikey. Do **not** enable billing | AI model, first in the chain | `GEMINI_API_KEY` |
| Groq API key | console.groq.com/keys | AI model fallback | `GROQ_API_KEY` |
| PayPal sandbox app | developer.paypal.com, Testing Tools, Sandbox Accounts: create a **US Business** and a **US Personal** account. Then Apps and Credentials: create an app of type **Merchant** using the US Business account | PayPal sandbox calls | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` |
| Bryntum trial | none. It installs from npm (see `spike/bryntum-next`) | the board | nothing |

Using your own sandbox accounts means nobody needs to share PayPal credentials. If the team wants one shared sandbox buyer login for demos, keep it in a password manager and share it there, not in chat.

## 4. Run it locally

```bash
git clone <repo url>
cd foldback
git checkout -b phaseN-yourtopic

docker compose -f deploy/compose.dev.yml up -d --wait
cd backend
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
corepack enable
corepack yarn install
corepack yarn hooks          # once per clone: pre-commit checks and the commit message check
corepack yarn migrate
corepack yarn test
```

Everything in `.env.example` already works for the Docker databases (ports 5432 and 5433). The compose file also creates the `foldback_app` role. The app connects as that role and migrations run as the owner (`MIGRATE_DATABASE_URL`), exactly like production. Add your own AI and PayPal keys to `.env` when a phase needs them.

If you run your own Postgres instead of Docker, create a role and two databases (`foldback`, `foldback_test`), and set `DATABASE_URL` and `TEST_DATABASE_URL` in `backend/.env`.

## 5. Before you open a pull request

Run, in each package you touched (`backend/` or `frontend/`):

```bash
corepack yarn format:check
corepack yarn typecheck
corepack yarn lint
corepack yarn knip
corepack yarn dup
corepack yarn test
```

CI runs the same gates plus the build, the shared-types check, a secret scan, and a dependency audit. Bundle budgets arrive with the frontend. The pre-commit hook (installed by `corepack yarn hooks`) already runs Prettier, ESLint, and typecheck on what you stage, and rejects a commit message that carries a co-author or generator trailer. The rules are in [quality.md](spec/quality.md). The short version:

- Search the code before writing a new function, type, or component. Reuse it.
- Never edit a migration that is already merged. Add `NNNN_name.sql`.
- The database refuses bad states on purpose. If a constraint blocks your code, fix the code, not the constraint.
- Money code (PayPal, resolve, sync), login code, and deletion code get a second reviewer.
- No new dependency without approval.

## 6. Where the real secrets live

| Secret | Location |
|---|---|
| Production `.env` | only on the Mac mini (`~foldback/foldback/.env`, file mode 600), plus Manveer's password manager. Never in chat |
| Cloudflare tunnel token | Manveer's Cloudflare dashboard. Used once on the Mac to install the tunnel, never shared |
| CI | none beyond GitHub's built-in token, which publishes the image. Deploys are pulled by the Mac, so there is no deploy key |
| Your own dev keys | your own `backend/.env` |

## 7. If a secret leaks

1. Tell the team right away.
2. Revoke it: PayPal (Apps and Credentials, regenerate the secret), Gemini or Groq (delete the key and create a new one), a GitHub token (delete it in Settings, Developer settings).
3. If it reached git history, rotating the key is what protects you. Deleting the commit is not enough.

## Project map

| Path | What it is |
|---|---|
| `docs/spec/` | the full build specification, one contract per file |
| `backend/` | Express API, Postgres migrations, tests (own `package.json` and `yarn.lock`) |
| `frontend/` | Next.js app (arrives in Phase 5) |
| `deploy/` | Docker Compose files (dev and production), the production env template, deploy, backup and smoke scripts, launchd jobs for the Mac mini |
| `spike/` | throwaway Phase 0 experiments (PayPal, AI models, Bryntum). Safe to ignore |
