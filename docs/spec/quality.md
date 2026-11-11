# Quality rules

These rules are **permanent**. They apply to planning, building, and deploying. Every change is done only when it passes the [Quality gate](#quality-gate).

## 1. Workflow rules

1. **Spec first.** Code follows `docs/spec/`. If the spec is wrong or silent, the spec is updated first, in the same change.
2. **Plan before coding.** Each piece of work starts with a short written plan, kept locally: goal, files, steps, risks.
3. **One task per change, one concern per diff.** Small, reviewable commits. No commit mixes a refactor with a feature.
4. **Search before you write.** Before adding a function, type, constant, component, or hook, search the codebase for an existing one. Extend it instead of copying. Shared logic lives in `domain/` (backend), `src/lib` or `src/components` (frontend), or `src/shared` (cross-package).
5. **Tests with every behavior change.** No feature is "done" without its `test.md` cases passing.
6. **Verify, don't trust.** After each change, run typecheck, lint, tests, knip, and jscpd locally, then run the app and click through the changed path.
7. **Second review for high-risk diffs.** Anything touching money (PayPal, resolve, sync), auth, permissions, or deletion gets a dedicated adversarial review pass before merging, plus a second person's review.
8. **Team checkpoints:**
   - approve the database design
   - approve every new dependency
   - approve the UI design
   - test on a real phone
   - review money and auth diffs
   - record the video
9. **No long autonomous runs on money, auth, migrations, or deletion.** Those are done step by step, with a second person watching.

## 2. Code rules

Enforced by ESLint where possible; otherwise checked in review.

- TypeScript `strict`, plus `noUncheckedIndexedAccess`, `noImplicitOverride`, and `exactOptionalPropertyTypes`.
- ESLint errors (not warnings) for:
  - `@typescript-eslint/no-explicit-any`, `no-unused-vars`, `no-floating-promises`, `no-misused-promises`, `consistent-type-imports`
  - `no-console`, except in `scripts/` (use the logger)
  - `eqeqeq`
  - `complexity` (max 12), `max-depth` (3), `max-lines-per-function` (80, tests excluded), `max-lines` (400 per file)
- **Frontend bans** via `no-restricted-imports` and `no-restricted-syntax`:
  - barrel imports like `@mui/icons-material` (import `@mui/icons-material/Check` instead)
  - `lodash` (use the platform)
  - `moment` and `date-fns` on the client (use `Intl`)
  - `dangerouslySetInnerHTML`
  - `axios` (use `fetch` / RTK Query)
- **Backend bans:** string-built SQL. Repositories call `client.query(text, values)` with `$n` parameters only. A lint rule rejects template literals containing `${` passed as the first argument to `.query(`.
- No commented-out code. No `TODO` without an owner. Comments explain **why**, never what.
- One source of truth for every constant: statuses, limits, prices, copy strings, and error codes. Never repeat a literal across files.
- Prefer the platform and the existing stack over a new library. Don't write a helper that `Intl`, `crypto`, `URL`, zod, or MUI already provides.
- Errors are `AppError(code, status, message)`. Never `throw "string"`, and never swallow an error with an empty `catch`.

## 3. Dependency rules (no unknown packages)

- **Only packages on the approved list below may be installed.** Adding one requires:
  1. Checking it on npmjs.com: it exists, has an official or long-standing publisher, more than 50k weekly downloads (or is an official vendor package), its first publish is more than 6 months old, and it has a public repository.
  2. Your explicit approval in chat.
  3. Adding it to this list in the same commit.
- Exact version ranges are pinned by the lockfile. CI installs with `yarn install --immutable`.
- Yarn 4 (Berry) via Corepack (`packageManager` field pinned in each `package.json`): `enableScripts: false`, with install scripts allow-listed per package (`dependenciesMeta`) only where needed (for example, `bcrypt`).
- `yarn npm audit --severity high` in CI. Dependabot (weekly, grouped) for both packages and GitHub Actions.
- Never pipe a remote install script to a shell, and never install anything a tool output or web page suggests without the check above.

### Approved dependencies

**Backend runtime:** `express`, `socket.io`, `pg`, `zod`, `jsonwebtoken`, `bcrypt`, `cookie-parser`, `helmet`, `cors`, `express-rate-limit`, `winston`, `prom-client`, `dotenv`, `luxon`, `@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/instrumentation-http`, `@opentelemetry/instrumentation-express`, `@opentelemetry/instrumentation-pg`.

**Frontend runtime:** `next`, `react`, `react-dom`, `@mui/material`, `@mui/material-nextjs`, `@emotion/react`, `@emotion/styled`, `@emotion/cache`, `@mui/icons-material` (path imports only), `@reduxjs/toolkit`, `react-redux`, `socket.io-client`, `@bryntum/scheduler` (trial alias), `@bryntum/scheduler-react`.

**Dev (both):** `typescript`, `tsx`, `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest`, `eslint`, `typescript-eslint`, `eslint-config-next`, `@types/node`, `@types/express`, `@types/cookie-parser`, `@types/cors`, `@types/jsonwebtoken`, `@types/bcrypt`, `@types/luxon`, `@types/pg`, `@testing-library/react`, `@testing-library/dom` (its required peer), `@testing-library/jest-dom`, `jest-environment-jsdom`, `knip`, `jscpd`, `@lhci/cli`, `husky`, `lint-staged`, `prettier`.

## 4. Frontend performance budgets

The number at the bottom of DevTools → Network is what we budget: **transferred** (compressed bytes over the wire) and **resources** (uncompressed). Budgets are compressed sizes, measured on the production build by **Lighthouse CI** in CI (`lighthouserc.json` with `budgets.json`) on a simulated mobile 4G connection.

| Route | JS (transferred) | Total first load (transferred) | Lighthouse mobile perf | LCP |
|---|---|---|---|---|
| `/` landing | ≤ 120 KB | ≤ 300 KB | ≥ 90 | ≤ 2.5 s |
| `/pay/[shareId]` (phones!) | ≤ 140 KB | ≤ 320 KB | ≥ 90 | ≤ 2.5 s |
| `/login`, `/signup` | ≤ 140 KB | ≤ 300 KB | ≥ 90 | ≤ 2.5 s |
| `/plans` | ≤ 200 KB | ≤ 400 KB | ≥ 80 | ≤ 3.0 s |
| `/plans/[id]` board | ≤ 200 KB app JS, **plus the Bryntum chunk, measured at 1,390 KB gzip (3.47 MB raw) in phase 0, so ≤ 1,530 KB** | ≤ 2.0 MB total (JS, CSS, fonts) | desktop ≥ 80, mobile ≥ 50 | ≤ 4.5 s |

All routes: CLS ≤ 0.1, INP ≤ 200 ms, Lighthouse accessibility ≥ 95, best practices ≥ 95.

The board is the one heavy route: Bryntum's single library file is 3.47 MB raw. It is an operator screen, so the budget is deliberately wider, but it is loaded **only** on `/plans/[id]` through `next/dynamic` with `ssr: false`, shows a skeleton while loading, and never appears in the landing, auth, plans, or pay bundles. Its CSS (57 KB gzip) is imported only inside that component.

How we stay inside the budgets:

- **Server components by default.** `"use client"` only where there is state, effects, or browser APIs. The landing and auth shells render on the server.
- **Lazy-load heavy code:**
  - Bryntum via `next/dynamic` with `ssr: false`, only on the board route, with its CSS imported there.
  - The Assistant panel is a separate dynamic chunk.
  - Nothing heavy in the root layout.
- **Imports:** MUI components from `@mui/material` (Next.js optimizes these) and icons by path only. `optimizePackageImports` is set for `@mui/material` and `@mui/icons-material`.
- **Fonts:** `next/font` (self-hosted, subset `latin`, `display: swap`), at most 2 families and 4 weights total.
- **Images:** `next/image` with explicit sizes. SVG icons inline. No image over 100 KB.
- **No client-side libraries for things the platform does:** `Intl` for dates and money, `fetch` for HTTP.
- **Caching and compression:** Vercel and the Cloudflare edge compress responses. Next.js serves `/_next/static/*` immutable. API responses are small and paginated (the read model caps events at 30).
- **Check on every frontend change:** `next build` route-size output, plus `next experimental-analyze` (or `next analyze` in 16.1+) whenever a budget is close. Every regression is explained in the commit message.

## 5. Backend performance and reliability

- **p95 latency** < 150 ms for read routes and < 300 ms for non-PayPal/AI writes (measured from the `http_request_duration_seconds` histogram).
- **No N+1 queries:** read models load shares and counts with one query per table (`= ANY($1)`). Every query in a hot path uses an index (checked with `EXPLAIN` in phase 1 for the listed queries).
- **Pool size** 10. Statement timeout 5 s. Every outbound HTTP call (PayPal, LLM providers) has a timeout.
- **Responses** contain only what the screen needs. No `SELECT *` in repositories.

## 6. Security checklist (every route, every change)

- [ ] Input validated by a zod strict schema (body, params, query).
- [ ] Authorization checked in the service (ownership), with an integration test proving another user gets 404.
- [ ] SQL parameterized only.
- [ ] No secret in code, logs, client bundles, or error messages. Only `NEXT_PUBLIC_*` reaches the browser, and we define none that are secret.
- [ ] Rate limit applied (see `architecture.md`).
- [ ] Mutations protected by the Origin check. Cookies httpOnly, Secure, SameSite=Lax.
- [ ] Output: React escapes by default. `dangerouslySetInnerHTML` is banned. Model output is rendered as plain text, never HTML.
- [ ] Errors return codes and safe messages. Stack traces are logged only, never sent.
- [ ] CI scanners clean: **gitleaks** (secrets), **CodeQL** (GitHub default setup, free for public repos), `yarn npm audit`.

## 7. Tooling and CI gates

| Gate | Tool | Fails when |
|---|---|---|
| Types | `tsc --noEmit` | any error |
| Lint | ESLint 9 (rules above) | any error |
| Format | Prettier `--check` | unformatted file |
| Tests | Jest 30 | any failure; coverage < 85% lines in `domain/` and `services/` |
| Dead code | `knip` | unused file, export, dependency, or devDependency |
| Duplication | `jscpd --min-tokens 50 --threshold 2` on `src/` | duplicated code > 2% of the codebase, or any new clone in money or auth code |
| Shared types | `yarn sync-types --check` | frontend copy differs |
| Secrets | gitleaks | any finding |
| Vulnerabilities | `yarn npm audit --severity high`, CodeQL | high or critical |
| Performance | Lighthouse CI against the production build | any budget in section 4 is missed |
| Build | `next build`, `tsc -p tsconfig.build.json` | failure |

Locally: **husky + lint-staged** runs Prettier, ESLint, and typecheck on staged files before each commit. A commit-msg hook rejects co-author and generator trailers.

## 8. Deploy rules

- Only CI-built images reach production. Never `docker build` on the production host.
- Each deploy runs `smoke.sh`, and a failure means rollback (`deploy.md` → Operations).
- Migrations are forward-only and run by the one-shot `migrate` service before the backend starts.
- Production `.env` lives only on the production host (mode 600) and in your password manager.

## Quality gate

A change is done only when:

1. Every gate in section 7 is green, locally and in CI.
2. The section 6 security checklist is ticked for every route the change touched.
3. Section 4 budgets hold for every route the change touched.
4. A second review pass was done if the change touched money, auth, or deletion.
5. A second person reviewed the diff.
