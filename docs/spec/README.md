# Foldback spec

**Nobody pays unless the group makes it.**

Foldback collects equal shares for a group plan through PayPal. Each share is placed on hold (a PayPal authorization) instead of being charged. If the confirmed headcount is met by the deadline, Foldback captures every hold. If it is not, Foldback voids every hold, so no money leaves anyone's account.


**The goal:** a production-grade system. Production grade here means:

- strict TypeScript
- a constraint-heavy Postgres schema
- idempotent money calls
- auth and rate limits
- structured logs, health checks, and metrics
- CI on every push
- Docker images
- HTTPS on a real, always-on server

Most demo projects skip these.

- **PayPal:** sandbox Orders v2 with `intent: AUTHORIZE`, then Payments v2 authorizations (capture, void, get).
- **AI:** free hosted models, DeepSeek (`deepseek-flash`, $2 prepaid) first, then free Groq (`gpt-oss-120b`) and Gemini Flash-Lite as fallbacks, read a pasted group chat into a fixed schema. An organizer agent answers questions, simulates outcomes, drafts reminders, and proposes clock moves. The model never sets amounts and never calls PayPal.
- **Board:** Bryntum Scheduler.
- **Hosting:** a team member's Mac mini runs the backend and Postgres under Docker Compose, reached through a Cloudflare Tunnel at `api.<domain>`. The frontend is on Vercel at `app.<domain>`. See `deploy.md`.

## Read order

1. `README.md` (this file)
2. `quality.md`
3. `product.md`
4. The contract files for the area you work on

| File | What it freezes |
|---|---|
| `architecture.md` | Stack, repo layout, layering, money state machine, security, observability |
| `data-model.md` | Postgres schema, constraints, migrations, seeds |
| `api.md` | HTTP routes, auth, Socket.IO events |
| `paypal.md` | Sandbox calls, idempotency, unknown outcomes, env |
| `ai.md` | Rule reader, organizer agent, cost and abuse limits |
| `scheduler.md` | Bryntum board, projection, license gate |
| `ui.md` | Screens, flows, copy (visual design is settled in phase 2) |
| `test.md` | Jest suites and manual negatives |
| `deploy.md` | Mac mini host, Docker image, Compose, Cloudflare Tunnel, Vercel, scripts, launchd jobs, CI/CD, operations |
| `demo.md` | Chat fixtures, sandbox prep, video, try-it path |
| `quality.md` | **Permanent** quality rules: workflow, code rules, approved dependencies, performance budgets, security checklist, CI gates |

## Build rules

- **`quality.md` applies to every change.** Every change passes its Quality gate: no duplication, no dead code, approved dependencies only, performance budgets, security checklist, and green CI.
- Do not add features, tables, routes, screens, or third-party tools that this spec does not name.
- Server code owns amounts, headcount, deadlines, authorize, capture, and void. The browser and the model do not.
- The keep-or-release decision is deterministic code (`services/resolve`, which calls the pure `domain/decide`). The agent can simulate or propose. It cannot decide.
- A `sample` row is not a PayPal payment. Never show a made-up PayPal id as verified.
- A missing or ambiguous PayPal response means an `*_unknown` status and stop. Never send a second order, capture, or void to "finish the demo."
- Constraints live in the schema. If code and a constraint disagree, the constraint wins and the code is wrong.
- One feature means one service, one repository, and one route file in the backend, plus one feature folder in the frontend. Docs are updated in the same change.
- `yarn typecheck`, `yarn lint`, and `yarn test` pass in both packages before a change merges. CI enforces it.
- Never print or commit secrets. Keep Bryntum source and license keys out of git.
- MIT license.

## Repository layout

```text
foldback/
  README.md                  project guide
  LICENSE                    MIT
  .github/workflows/ci.yml
  docs/spec/                 this spec
  backend/                   Express 5 API + Socket.IO + Postgres (own package.json and yarn.lock)
  frontend/                  Next.js 16 app (own package.json and yarn.lock)
  deploy/                    compose files, env template, scripts, launchd jobs
```

## One-sentence pitch

Foldback turns a group chat into a PayPal hold for each friend: the holds are captured only if everyone pays by the deadline, and released if not, so nobody is ever charged for a plan that fell through.
