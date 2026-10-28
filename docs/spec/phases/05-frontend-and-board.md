# Phase 5 — Frontend and board

Budget: 10 hours. Hat: UI. Depends on phases 2 and 3. Dates: 3–5 November 2026.

## Read

- `ui.md`, including the approved Visual design
- `scheduler.md`
- `architecture.md`: Frontend layout
- `api.md`: Auth, Realtime, List and read, Scheduler projection
- `test.md`: phase 5 cases

## Goal

The real frontend, built to the approved design. A visitor lands, tries it as a guest, sees the two sample plans, pastes a chat, confirms it, and opens a Bryntum board that updates live through sockets.

## Create

```text
frontend/  (create-next-app, App Router, TypeScript, Yarn, ESLint 9)
  next.config.ts                      output "standalone"; dev rewrites /api and /socket.io → :8787
  package.json scripts                "dev": "next dev --webpack", "build": "next build --webpack" (Turbopack crashes on Bryntum, see scheduler.md)
  src/theme/                          tokens + MUI theme from phase 2; AppRouterCacheProvider
  src/store/  src/api/                RTK Query baseApi (credentials: include), tags: Me, ContractList, Contract, Scheduler, PublicShare
  src/sockets/                        singleton client; joins rooms; invalidates tags on events
  src/app/(auth)/login, signup        src/app/page.tsx (landing)
  src/app/plans/page.tsx              src/app/plans/[id]/page.tsx
  src/features/{auth,rules,board}/
  src/features/board/FoldbackScheduler.tsx   dynamic import, ssr:false
  src/components/  src/lib/format.ts
  src/middleware.ts                   redirect to /login when no fb_session cookie on /plans*
  Dockerfile
backend/src/services/projection.service.ts  + GET /api/contracts/:id/scheduler
backend/test/integration/scheduler.test.ts
frontend/src/**/*.test.ts(x)
```

CI gets the frontend job with every `quality.md` §7 gate, including Lighthouse CI and `budgets.json`. The frontend image is added to Compose.

## Do not

- Compute money status in the client.
- Enable Bryntum drag, resize, or create.
- Build the Pay page or the Assistant card yet. Keep placeholders.

## Exit check

- [ ] Phase 5 cases pass. Both packages typecheck, lint, and test clean. CI is green and deployed.
- [ ] On production at 1280 px, the sample cabin board shows three Held and Maya Waiting with all markers, with no horizontal scroll and readable labels.
- [ ] Two browser tabs on the same board: an action in one updates the other within a second.
- [ ] Lighthouse CI budgets (`quality.md` §4) pass for `/`, `/login`, `/plans`, and `/plans/[id]`. Record the transferred sizes in the exit note.
- [ ] `learn/07-frontend-and-board.md` is written.

## Exit note

Bryntum preset used:

Transferred JS per route:
