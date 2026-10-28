# Plan

Build starts Wednesday 28 October 2026. The hard deadline is Thursday 12 November 2026, 12:00 Pacific. Target submission: Wednesday 11 November, evening Pacific.

Hour budget: about 76 team-hours, roughly 5 per day. Each phase budget includes its `quality.md` gate work (tests, review, cleanup). Quality is part of the work, not extra. Design comes first (database, then UI), then backend foundation and an early deploy, then features. If a phase overruns, cut that phase's stretch items first, then the items under "Cut list." Never cut either outcome in `product.md`, the money safety rules, or CI.

| Phase | Target dates | Budget | Hat | Depends on | Done |
|---|---|---|---|---|---|
| 0 Spike | 28–29 Oct | 6h | PayPal + UI | — | [x] |
| 1 Database design | 29–30 Oct | 5h | Data | 0 | [ ] |
| 2 UI design | 30 Oct – 1 Nov | 4h | Product + UI | 0 (runs beside 1 and 3) | [ ] |
| 3 Backend foundation + first deploy | 31 Oct – 2 Nov | 10h | Backend + Ops | 1 | [ ] |
| 4 Rule reader | 2–3 Nov | 6h | Rules | 3 | [ ] |
| 5 Frontend and board | 3–5 Nov | 10h | UI | 2, 3 | [ ] |
| 6 Pay link and hold | 5–6 Nov | 7h | PayPal + UI | 4, 5 | [ ] |
| 7 Resolve: keep or release | 6–7 Nov | 8h | Rules + PayPal | 6 | [ ] |
| 8 Organizer agent | 8–9 Nov | 7h | Rules + UI | 7 | [ ] |
| 9 Ship and judge pack | 9–11 Nov | 13h | Product + Ops | 8 | [ ] |

Why this order:

- The **spike** proves the three risky integrations before any design time is spent on them.
- **Database design** comes before code, because every service is built on the schema and its constraints.
- **UI design** runs in parallel with backend work, so neither waits on the other.
- **First deploy in phase 3:** the Oracle VM, Caddy, and CI/CD are set up while the app is only `/health`. Every later phase then ships to production, and the final days are not spent on infrastructure surprises.

Hats (switch in this order even if one person does everything):

- Product: copy, demo, video, Devpost
- UI: Next.js, MUI, Bryntum
- Backend: Express, auth, observability
- Data: schema, migrations, SQL
- PayPal: orders, authorize, capture, void
- Rules: LLM extraction, resolve, agent
- Ops: Docker, Compose, Caddy, CI

## Phase summaries

- **0 Spike.** Bryntum renders in Next.js 16 / React 19.2. Sandbox authorize → capture and authorize → void return real ids. Gemini Flash-Lite and Groq `gpt-oss-120b` structured output and tool use work. Send the Bryntum license email.
- **1 Database design.** Finalize `data-model.md` with a review checklist. Write `0001_init.sql` (tables, constraints, transition tables, triggers), `migrate.ts`, and `principles.md`. Constraint tests run against real Postgres.
- **2 UI design.** You share screenshots you like. I suggest template sources, you pick one and list modifications, and we produce tokens and per-screen mockups for approval. Nothing is coded until you approve.
- **3 Backend foundation.** Express 5 app with layering, env, logging, metrics, health, errors, rate limits, auth (signup, login, guest, logout, me), seeds, and reset. Socket.IO skeleton. Dockerfiles, CI, Oracle VM, Caddy. `/api/health` is live on HTTPS.
- **4 Rule reader.** Create, clarify, and confirm, with the validator, AI guard, and extraction cache.
- **5 Frontend and board.** Next.js app shell, theme from phase 2, auth pages, plans page, Bryntum board, Person card, sockets.
- **6 Pay link and hold.** Pay page, checkout, authorize, sync, and live updates to the board.
- **7 Resolve.** Clock, resolve, capture and release waves, contract lock, Paused banner.
- **8 Agent.** Five tools, proposals, the Proposed marker, drafts.
- **9 Ship.** Hardening pass, README, LICENSE, backup and restore check, rehearsal, video, Devpost.

## Phase 0 record

License email sent on: (fill in)

Reply: (fill in: pending, yes through 15 December 2026, or no)

## Cut list (in this order, only if behind)

1. OpenTelemetry exporter wiring (keep `/metrics` and logs)
2. Agent reply streaming
3. CI auto-deploy (deploy manually with `deploy.sh`)
4. Backup systemd timer (keep the manual `backup.sh`)
5. Agent proposals (keep the read-only tools: status, simulate, reminders)

## Stop rules

- Phase 0 cannot authorize, capture, or void in sandbox: stop. Report PayPal's `name`, `issue`, and `debug_id`. Never fake ids.
- The Bryntum trial won't install, or won't run on React 19.2 / Next.js 16: stop and ask on the PayPal Discord. Never draw a substitute calendar.
- No Oracle Ampere capacity by 2 November: deploy the same Compose stack to an Azure B2s VM (the cost is noted in the README) and continue.
- A phase needs a schema change: write a new numbered migration and update `data-model.md` in the same change. Never edit an applied migration.
- The model returns amounts the validator didn't check: stop and fix the validator.
- It's 8 November and phase 7 isn't done: apply the cut list from item 3 down, and protect phase 9's full budget.
- It's 10 November and the video isn't recorded: stop all feature work.

## Definition of finished

1. `https://{domain}` serves the app over HTTPS from the Oracle VM. "Try it as a guest" works from a fresh browser.
2. A new machine with Node 24, Yarn, Docker, PayPal sandbox credentials, free Gemini and Groq keys, and the Bryntum trial can follow the README to run it locally.
3. CI is green on `main`: typecheck, lint, and tests for both packages, plus images pushed to ghcr.io.
4. Every case in `test.md` passes.
5. The YouTube video is public, under 3 minutes, and shows both outcomes with real sandbox ids.
6. Devpost is submitted before 12 November, 12:00 PT.
