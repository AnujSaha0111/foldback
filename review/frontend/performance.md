# Frontend: performance

Method: a production build of `main` and of `review-nishit`, both served with `next start`. Each route's HTML was fetched and the gzip size (`-9`) of every script it loads was added up. This compares branches reliably. It is not Lighthouse's "transferred" figure, which `docs/spec/quality.md` §4 budgets: Vercel serves Brotli, which is smaller, and Lighthouse also counts later requests.

| Route | Budget (JS, transferred) | main | review-nishit |
|---|---|---|---|
| `/` | ≤ 120 KB | 247.8 KB | 248.6 KB |
| `/login` | ≤ 140 KB | 258.3 KB | 256.6 KB |
| `/signup` | ≤ 140 KB | 258.6 KB | 256.8 KB |
| `/pay/[shareId]` | ≤ 140 KB | 255.1 KB | 256.3 KB |

## [FE-060] Every public route is over its JS budget, by about the framework's own size

- Category: Performance budget
- Severity: Medium
- Status: Partially Implemented
- File: `docs/spec/quality.md` §4; the build
- Code Location: `/pay/[shareId]` chunks, gzip `-9`:

  | Chunk | Size |
  |---|---|
  | `react-dom` | 62.7 KB |
  | Next runtime | 65.9 KB |
  | Redux and RTK Query | 26.3 KB |
  | Emotion and MUI styles | 23.7 + 8.4 + 4.4 KB |
  | `socket.io-client` | 12.5 KB |

- Description: React DOM plus the Next runtime come to about 129 KB before any Foldback code. That is about the whole 140 KB budget for `/pay` and more than the 120 KB budget for `/`.
- Current Implementation: pages are static where possible, Bryntum is isolated to the board, and fonts are self-hosted. The known `/pay` overage was already recorded in `.claude/tasks/phase-06.md`.
- Problem: the budgets cannot be met with this stack as written, so they guide nothing.
- Why It Matters: the pay page opens on phones over mobile data; judges reading `quality.md` will compare it with reality.
- Recommended Solution:
  1. Measure with Lighthouse on the deployed site (FE-064) to get the true transferred numbers.
  2. On `/pay` only, drop the socket and poll every 5 s while a share is open (saves `socket.io-client`, about 12.5 KB). The board keeps the socket.
  3. Re-baseline the budgets in `quality.md` to measured numbers plus a margin, and say why.

  Removing MUI or Redux from `/pay` would save more but means a second component system. That trade-off is not worth it before 12 November.
- Implementation Complexity: Medium
- Breaking Change Risk: Low
- Dependencies: a spec change. The spec and the code disagree here, so the human decides.
- Verification Method: Lighthouse mobile on `/pay/<a real link>`.

## [FE-061] This branch's changes cost almost nothing

- Category: Performance
- Severity: Informational
- Status: Implemented
- File: see the table above
- Code Location: —
- Description: Changes from this branch: `/pay` +1.2 KB (skeleton, button state), `/` +0.8 KB, and the auth pages −1.7 to −1.8 KB (chunk regrouping). The command menu's palette is its own chunk. It loads only on organizer screens, after the page is up.
- Current Implementation: measured.
- Problem: none.
- Why It Matters: the guardrail said keep `/pay` light.
- Recommended Solution: none.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: the script-size comparison above.

## [FE-062] Bryntum stays on the board route

- Category: Code splitting
- Severity: Informational
- Status: Implemented
- File: `frontend/src/features/board/components/SchedulerPanel/index.tsx`
- Code Location: `dynamic(() => import("./FoldbackScheduler"), { ssr: false, loading: LoadingBoard })`
- Description: The 3.47 MB raw library loads only on `/plans/[id]`, behind a placeholder of fixed height, so nothing jumps.
- Current Implementation: verified in code. No Bryntum chunk appears in the HTML for `/`, `/login`, `/signup` or `/pay`.
- Problem: none.
- Why It Matters: the public pages stay light.
- Recommended Solution: keep.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: script list of each route's HTML.

## [FE-063] The spec says the assistant is its own chunk; it is not

- Category: Spec mismatch
- Severity: Low
- Status: Missing
- File: `docs/spec/quality.md` §4 ("The Assistant panel is a separate dynamic chunk"), `frontend/src/features/board/components/Board/index.tsx`
- Code Location: `import { AssistantCard } from "@/features/assistant/components/AssistantCard";`
- Description: The assistant is imported statically into the board.
- Current Implementation: static import. It affects only the board route, which is already heavy.
- Problem: the spec and the code disagree.
- Why It Matters: small in bytes. It matters for honesty when judges read the spec.
- Recommended Solution: either load it with `next/dynamic` (cheap: it sits below the fold), or change the spec line. The human decides which.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: a human decision (spec versus code).
- Verification Method: the board route's chunk list.

## [FE-064] No Lighthouse CI, although the spec says budgets are checked by it

- Category: Spec mismatch, tooling
- Severity: Medium
- Status: Missing
- File: `docs/spec/quality.md` §4, `.github/workflows/ci.yml`
- Code Location: no `lighthouserc.json`, no `budgets.json`, and no Lighthouse step in CI
- Description: The spec says budgets are "measured on the production build by Lighthouse CI in CI". Nothing does this.
- Current Implementation: none. Next 16's `next build` no longer prints route sizes either.
- Problem: the performance and accessibility budgets (Lighthouse ≥ 90 performance, ≥ 95 accessibility) are not enforced or even measured.
- Why It Matters: a reviewer comparing the spec with the repo finds a claimed gate that does not exist.
- Recommended Solution: before 11 November, either run Lighthouse once by hand on the deployed site and record the scores in `quality.md`, or add `treosh/lighthouse-ci-action` against the Vercel preview URL with `budgets.json`. Running it by hand is enough for the hackathon. The workflow needs a new third-party action, which needs the human's approval.
- Implementation Complexity: Low (by hand) / Medium (CI)
- Breaking Change Risk: Low
- Dependencies: Ravi records site-wide Lighthouse scores in `misc/` (cross-reference). The human decides whether to change the spec or the CI.
- Verification Method: a Lighthouse report per route.

## [FE-070] Client-side view transitions not enabled

- Category: Motion
- Severity: Informational
- Status: Partially Implemented
- File: `frontend/src/app/globals.css`, `frontend/next.config.ts`
- Code Location: `@view-transition { navigation: auto }`
- Description: Cross-document transitions are on. Client-side route transitions would need `experimental.viewTransition` and React's canary `ViewTransition`.
- Current Implementation: cross-document only.
- Problem: in-app moves (plans → board) cut without a transition.
- Why It Matters: polish only.
- Recommended Solution: after judging, try `experimental.viewTransition` with a short cross-fade on the board's main content. Not one week before submission.
- Implementation Complexity: Medium
- Breaking Change Risk: Medium (experimental)
- Dependencies: none
- Verification Method: navigation in Chrome, with and without reduced motion.
