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
  next.config.ts                      dev rewrites /api and /socket.io → :8787; in production the API is https://api.<domain> (deploy.md)
  package.json scripts                "dev": "next dev --webpack", "build": "next build --webpack" (Turbopack crashes on Bryntum, see scheduler.md)
  src/theme/                          tokens + MUI theme from phase 2; AppRouterCacheProvider
  src/store/  src/api/                RTK Query baseApi (credentials: include), tags: Me, ContractList, Contract, Scheduler, PublicShare
  src/sockets/                        singleton client; joins rooms; invalidates tags on events
  src/app/(auth)/login, signup        src/app/page.tsx (landing)
  src/app/plans/page.tsx              src/app/plans/[id]/page.tsx
  src/features/{auth,rules,board}/
  src/features/board/FoldbackScheduler.tsx   dynamic import, ssr:false
  src/components/<ComponentName>/     index.tsx (markup and logic), styled.ts (MUI styled() parts, tokens only), index.test.tsx; optional types.ts
  src/features/<feature>/components/<ComponentName>/   same shape for feature-owned components
  src/lib/format.ts  src/lib/status.ts
  src/middleware.ts                   redirect to /login when no fb_session cookie on /plans*
backend/src/services/projection.service.ts  + GET /api/contracts/:id/scheduler
backend/test/integration/scheduler.test.ts
frontend/src/**/*.test.ts(x)
```

CI gets the frontend job with every `quality.md` §7 gate, including Lighthouse CI and `budgets.json`. Vercel builds `frontend/` from GitHub and serves it at `app.<domain>`; there is no frontend Dockerfile or Compose service (`deploy.md` → Frontend on Vercel).

## Frontend engineering standard

Written like a production codebase, modular and without repetition.

- **One Redux store** (`src/store`): `configureStore`, typed `useAppDispatch` and `useAppSelector` (`.withTypes`), one slice per concern (`session`, `theme`, `boardSelection`, `assistant`, `ui`), memoized selectors beside each slice. Server data lives only in RTK Query; slices hold UI state only.
- **One `baseApi`**, extended per feature with `injectEndpoints`. Tags are declared once. A listener middleware turns socket events into tag invalidations. No `fetch` calls in components.
- **Theme in the store**: `theme` slice, default `light`, toggle in the footer and header menu, persisted in `localStorage` (guarded), applied as `data-theme` and to the MUI theme. The MUI theme is generated from `docs/design/tokens.css` (radius 0, no shadows).
- **Single source for status**: one map `status → label, tone` in `src/lib/status.ts`, used by the tag, the board bar, the person card and the Pay page. A new status is added in one place.
- **Component folders**: every component is `components/<ComponentName>/index.tsx` plus `styled.ts`. `index.tsx` has no styling beyond using the styled parts; `styled.ts` holds all `styled()` definitions and reads only theme tokens (no hex, no magic numbers). Import by folder (`import { Logo } from "@/components/Logo"`), so the folder name is the public name. Tests sit beside the component as `index.test.tsx`.
- **Primitives once**: `Logo`, `Button`, `Field`, `StatusTag`, `Callout`, `DataTable`, `Money`, `Page`. Features compose them; no copy-pasted markup or inline hex values.
- **Scroll motion as a hook**: `useScrollProgress(ref)` sets one CSS variable; scenes are pure CSS from it. Disabled under `prefers-reduced-motion`. Never on the Pay page.
- Strict TypeScript, no `any`, errors shown as the API `message`, every component has a test for its states, files stay small (split a component past about 150 lines).

## Do not

- Compute money status in the client.
- Enable Bryntum drag, resize, or create.
- Build the Pay page or the Assistant card yet. Keep placeholders.

## Exit check

- [ ] Phase 5 cases pass. Both packages typecheck, lint, and test clean. CI is green and Vercel has deployed `main`.
- [ ] On production at 1280 px, the sample cabin board shows three Held and Maya Waiting with all markers, with no horizontal scroll and readable labels.
- [ ] Two browser tabs on the same board: an action in one updates the other within a second.
- [ ] Lighthouse CI budgets (`quality.md` §4) pass for `/`, `/login`, `/plans`, and `/plans/[id]`. Record the transferred sizes in the exit note.
- [ ] `learn/07-frontend-and-board.md` is written.

## Exit note

Bryntum preset used:

Transferred JS per route:
