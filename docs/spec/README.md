# Foldback spec

**Nobody pays unless the group makes it.**

Foldback collects equal shares for a group plan through PayPal. Each share is placed on hold (a PayPal authorization) instead of being charged. If the confirmed headcount is met by the deadline, Foldback captures every hold. If it is not, Foldback voids every hold, so no money leaves anyone's account.

Hackathon: [Build What's Next with PayPal and AI](https://paypalaihackathon.devpost.com/). Hard deadline Thursday 12 November 2026, 12:00 Pacific. Target submission 11 November. Judging runs 1 to 15 December 2026.

**Two goals, equal weight:** win the hackathon, and ship a production-grade system. Production grade here means:

- strict TypeScript
- a constraint-heavy Postgres schema
- idempotent money calls
- auth and rate limits
- structured logs, health checks, and metrics
- CI on every push
- Docker images
- HTTPS on a real VM

Most hackathon entries skip these, and judges notice.

- **PayPal:** sandbox Orders v2 with `intent: AUTHORIZE`, then Payments v2 authorizations (capture, void, get).
- **AI:** free hosted models, Gemini first with Groq (`gpt-oss-120b`) as fallback, read a pasted group chat into a fixed schema. An organizer agent answers questions, simulates outcomes, drafts reminders, and proposes clock moves. The model never sets amounts and never calls PayPal.
- **Sponsor tool:** Bryntum Scheduler (we compete for Best Use of Bryntum).
- **Hosting:** Azure. One VM runs Docker Compose + Caddy (account B). The database is Azure Database for PostgreSQL Flexible Server (account A). A third account (C) is the scale-out spare. See `deploy.md`.

## Read order

1. `README.md` (this file)
2. `quality.md`
3. `product.md`
4. `phases/NN-*.md` for the active phase
5. The contract files that phase lists

| File | What it freezes |
|---|---|
| `plan.md` | Phase order, dates, hour budget, stop rules |
| `architecture.md` | Stack, repo layout, layering, money state machine, security, observability |
| `data-model.md` | Postgres schema, constraints, migrations, seeds |
| `api.md` | HTTP routes, auth, Socket.IO events |
| `paypal.md` | Sandbox calls, idempotency, unknown outcomes, env |
| `ai.md` | Rule reader, organizer agent, cost and abuse limits |
| `scheduler.md` | Bryntum board, projection, license gate |
| `ui.md` | Screens, flows, copy (visual design is settled in phase 2) |
| `test.md` | Jest suites and manual negatives |
| `deploy.md` | Docker, Compose, Caddy, Azure VM and database, accounts, scale-out playbook, CI/CD |
| `demo.md` | Chat fixtures, sandbox prep, video, judge path, Devpost text |
| `quality.md` | **Permanent** rules for AI-assisted building: workflow, code rules, approved dependencies, performance budgets, security checklist, CI gates |

## Active phase

Start at [phases/00-spike.md](phases/00-spike.md).

| Phase | File | Status |
|---|---|---|
| 0 Spike | `phases/00-spike.md` | done |
| 1 Database design | `phases/01-database-design.md` | done |
| 2 UI design | `phases/02-ui-design.md` | done |
| 3 Backend foundation | `phases/03-backend-foundation.md` | next |
| 4 Rule reader | `phases/04-rule-reader.md` | blocked on 3 |
| 5 Frontend and board | `phases/05-frontend-and-board.md` | blocked on 3 |
| 6 Pay link and hold | `phases/06-pay-and-hold.md` | blocked on 4 and 5 |
| 7 Resolve: keep or release | `phases/07-resolve.md` | blocked on 6 |
| 8 Organizer agent | `phases/08-agent.md` | blocked on 7 |
| 9 Ship and judge pack | `phases/09-ship.md` | blocked on 8 |

## Build rules

- **`quality.md` applies to every phase.** Each phase exit check includes its Quality gate: no duplication, no dead code, approved dependencies only, performance budgets, security checklist, and green CI.
- Implement the active phase and stop at its exit check. Mark it done in `plan.md` and in the table above.
- Do not add features, tables, routes, screens, or sponsor tools that this spec does not name.
- Server code owns amounts, headcount, deadlines, authorize, capture, and void. The browser and the model do not.
- The keep-or-release decision is deterministic code (`services/resolve`, which calls the pure `domain/decide`). The agent can simulate or propose. It cannot decide.
- A `sample` row is not a PayPal payment. Never show a made-up PayPal id as verified.
- A missing or ambiguous PayPal response means an `*_unknown` status and stop. Never send a second order, capture, or void to "finish the demo."
- Constraints live in the schema. If code and a constraint disagree, the constraint wins and the code is wrong.
- One feature means one service, one repository, and one route file in the backend, plus one feature folder in the frontend. Docs are updated in the same change.
- `yarn typecheck`, `yarn lint`, and `yarn test` pass in both packages before a phase is marked done. CI enforces it.
- Never print or commit secrets. Keep Bryntum source and license keys out of git.
- MIT license. No AI tool attribution in commits, PR text, code comments, or docs.
- When a contract file and a phase file disagree, the contract file wins. Stop and ask.

## Repository layout

```text
PayPal-Hackathon/
  README.md                  judge-facing (final version in phase 9)
  LICENSE                    MIT (phase 9)
  .github/workflows/ci.yml
  docs/spec/                 this spec
  backend/                   Express 5 API + Socket.IO + Postgres (own package.json and yarn.lock)
  frontend/                  Next.js 16 app (own package.json and yarn.lock)
  deploy/                    compose files, Caddyfile, env templates, scripts
  learn/                     numbered study notes, gitignored, never pushed
```

## One-sentence pitch

Foldback turns a group chat into a PayPal hold for each friend: the holds are captured only if everyone pays by the deadline, and released if not, so nobody is ever charged for a plan that fell through.
