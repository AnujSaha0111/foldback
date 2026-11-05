# Frontend: state management and data fetching

Scope: `frontend/src/store/`, `frontend/src/api/`, `frontend/src/sockets/`, and every screen's loading, error and empty states.

Overall: server data lives only in RTK Query; the Redux store holds UI state (theme) only. Tags are declared once in `baseApi`. Live screens join a Socket.IO room and refetch on an invalidation message (the socket never carries data); when the socket is not joined, `useRoom` returns a 10 s polling interval. Errors show the API's own sentence through `FormError`.

## [FE-010] No revalidation on tab focus or reconnect

- Category: Data fetching (stale-while-revalidate)
- Severity: Medium
- Status: Implemented (fixed on `review-nishit`)
- File: `frontend/src/api/baseApi.ts`, `frontend/src/components/Providers/index.tsx`
- Code Location: `refetchOnFocus`, `refetchOnReconnect`, `setupListeners(store.dispatch)`
- Description: A tab left in the background (an organizer switching to WhatsApp to send links, a friend switching to PayPal's app) came back to whatever it showed when it left, until the socket or the poll caught up.
- Current Implementation: RTK Query now refetches active queries on focus and on reconnect; cached data stays on screen meanwhile.
- Problem: none left. Cost: one read per active query per focus.
- Why It Matters: the pay page and the board are about live status; a stale "Waiting" after someone paid looks broken in a demo.
- Recommended Solution: done.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: open a board, switch tabs, come back; the network panel shows one refetch per query.

## [FE-011] Live updates: socket invalidation with a polling fallback

- Category: Data fetching
- Severity: Informational
- Status: Implemented
- File: `frontend/src/sockets/useRoom.ts`, `useContractLive.ts`, `useShareLive.ts`
- Code Location: `FALLBACK_POLL_MS = 10_000`
- Description: The socket only says "something changed"; the screen refetches through RTK Query, so the cache stays the single source of truth.
- Current Implementation: verified in code and by `useContractLive` / `useShareLive` tests.
- Problem: none.
- Why It Matters: no second data path to keep consistent.
- Recommended Solution: keep.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Manveer for the server side of the rooms (BE area).
- Verification Method: tests; production check by the user earlier (board updated when a friend paid).

## [FE-012] Loading states were spinners on the main data screens

- Category: Loading states
- Severity: Low
- Status: Implemented (fixed on `review-nishit`)
- File: `Board/index.tsx`, `PlansList/index.tsx`, `PayScreen/index.tsx`, `app/plans/loading.tsx`
- Code Location: `BoardSkeleton`, `PlansSkeleton`, `PaySkeleton`, `PlansLoading`
- Description: See `ui-ux-20-points.md`, item 1.
- Current Implementation: skeletons shaped like the content.
- Problem: none left. The board's chart area still shows the spinner inside its fixed-height placeholder while the Bryntum chunk loads; its height is reserved, so nothing jumps.
- Why It Matters: perceived speed, no layout shift.
- Recommended Solution: done.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: browser on `/pay` and `/plans`; the board on a preview deploy.

## [FE-013] The assistant's conversation is lost on reload

- Category: State
- Severity: Low
- Status: Missing
- File: `frontend/src/features/assistant/components/AssistantCard/index.tsx`
- Code Location: `const [entries, setEntries] = useState<Entry[]>([])`
- Description: The conversation lives in component state. A reload or leaving the board clears it, including any proposal not yet approved.
- Current Implementation: by design the server keeps no chat history; the client sends the last 12 turns.
- Problem: an organizer who reloads mid-conversation loses the drafts and proposals.
- Why It Matters: small, but it is the AI feature judges will try.
- Recommended Solution: keep `entries` in session storage per plan (`foldback:assistant:{contractId}`), reusing `useDraft`'s storage helpers generalised to JSON. Proposals must still be approved through the normal routes, so restoring them is safe; drop restored proposals older than the plan's last clock move.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Ravi (AI-xxx) may prefer the server to own history; coordinate first.
- Verification Method: ask a question, reload, see the conversation.

## [FE-014] Sync errors in the Paused banner are not shown

- Category: Error states
- Severity: Low
- Status: Partially Implemented
- File: `frontend/src/features/board/components/Controls/index.tsx`
- Code Location: `Paused`, `check()`
- Description: Check payment syncs each unclear share and then resolves. A failed sync is ignored; only the resolve error is shown.
- Current Implementation: `for (const share of unknown) await sync({ shareId: share.id });` with no look at the result.
- Problem: if PayPal or the API fails on the sync, the organizer sees the plan still paused with no reason why. Nothing moves money wrongly (the server keeps the plan blocked).
- Why It Matters: an honest error in the one state that worries people.
- Recommended Solution: stop at the first failed sync and show its `FormError`; skip the resolve in that case.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none (frontend only; the server already refuses unsafe moves).
- Verification Method: Controls test with `sync` resolving to `{ error }`.
