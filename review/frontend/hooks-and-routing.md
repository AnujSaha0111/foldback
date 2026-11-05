# Frontend: React hooks and routing

Scope: every `useEffect`, ref and custom hook; App Router pages and layouts; `src/proxy.ts`; what happens on 401.

Overall: effects are few and each has a clear job. The PayPal return runs once per page through a ref guard, so React StrictMode's double effect cannot authorize twice. Browser-only values (the saved draft, the keyboard platform) are read with `useSyncExternalStore` through `useClientValue`, which keeps server and client renders equal. `react-hooks` 7 lint rules pass.

## [FE-020] The PayPal return is StrictMode-safe and drops the token only after a real answer

- Category: Hooks
- Severity: Informational
- Status: Implemented
- File: `frontend/src/features/pay/useReturnFromPayPal.ts`
- Code Location: `useReturnFromPayPal`, `started` ref, `answered()`
- Description: Authorize after approval, sync after cancel, retried up to 11 times on `resolve_in_progress` or `internal`; the query string is removed only when the server gave a real answer, so a refresh after a lost reply asks again.
- Current Implementation: verified in code and by eight PayScreen tests (return, cancel, retry, give-up, token kept).
- Problem: none.
- Why It Matters: this is the line between "money held" and "we do not know".
- Recommended Solution: keep.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Manveer for the server side (BE area).
- Verification Method: `PayScreen` tests; production test by the user (hold, cancel).

## [FE-021] The route guard checks the cookie exists; the API decides

- Category: Routing, auth
- Severity: Informational
- Status: Implemented
- File: `frontend/src/proxy.ts`, `frontend/src/features/auth/components/AppHeader/index.tsx`
- Code Location: `proxy`, the 401 effect in `AppHeader`
- Description: `/plans/*` without `fb_session` redirects to `/login?next=…`; a stale cookie is caught by `getMe` returning 401, and the header replaces the route with the login page, keeping `next`. `safeNext` stops open redirects.
- Current Implementation: verified in code and tests (`proxy.test.ts`, `AppHeader` test, `safeNext.test.ts`).
- Problem: see FE-022.
- Why It Matters: the API stays the only authority.
- Recommended Solution: keep.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: tests; a local check with a placeholder cookie showed the plans page shell, as expected.

## [FE-022] A stale session can flash an error before the redirect

- Category: Routing
- Severity: Low
- Status: Needs Verification
- File: `frontend/src/features/board/components/Board/index.tsx`, `PlansList/index.tsx`
- Code Location: `if (!data) return error ? <FormError error={error} /> : …`
- Description: With an expired cookie, the board's own query fails with 401 at about the same time as the header's `getMe`. The board can show the API's error sentence for a moment before the header's effect sends the visitor to sign in.
- Current Implementation: each screen renders its own error.
- Problem: a brief red sentence before the login page.
- Why It Matters: looks like a bug to someone whose guest session expired (guests expire after 7 days, inside the judging window).
- Recommended Solution: treat 401 as "not an error" in `FormError` (render nothing for status 401), since the header always handles it.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: set a bogus `fb_session` on the production site, open a board, watch for a flash.

## [FE-023] The pasted chat was lost on Back or reload

- Category: Navigation, unsaved changes
- Severity: Medium
- Status: Implemented (fixed on `review-nishit`)
- File: `frontend/src/features/rules/useDraft.ts`, `RuleScreen/index.tsx`
- Code Location: `useDraft("foldback:rule-text")`, `settle()`
- Description: See `ui-ux-20-points.md`, item 12.
- Current Implementation: kept in session storage until the reading is ready, then forgotten; storage errors (private windows) are ignored.
- Problem: none left. A demo reset keeps the typed chat in the box, which is intended (the organizer can read it again).
- Why It Matters: the first thing a judge does is paste a chat; losing it to a mis-tap on Back is the worst first impression.
- Recommended Solution: done.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: `useDraft` tests; browser: typed, reloaded, text and count came back with no hydration warning.

## [FE-024] Effects that listen to the window clean up after themselves

- Category: Hooks
- Severity: Informational
- Status: Implemented
- File: `CommandMenu/index.tsx`, `PayScreen/index.tsx` (`HoldButton`), `hooks/useScrollProgress.ts`, `LiveHolds/useLean.ts`
- Code Location: `addEventListener` / `removeEventListener` pairs
- Description: Every window listener added in an effect is removed in its cleanup; reduced-motion users skip the scroll listeners entirely.
- Current Implementation: verified by reading each effect.
- Problem: none.
- Why It Matters: no leaks across client navigations.
- Recommended Solution: keep.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: code read; CommandMenu test toggles the listener.
