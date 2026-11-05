# UI/UX: the 20 points

Audited on `review-nishit`, based on `main` at `5f72725`. Every row was checked in the code. Rows marked *verified in a browser* were also checked on a local production build (`next build` + `next start`); the board itself was not run locally (Bryntum stays off this machine) and needs a check on a preview deploy.

## Guardrails that shaped the work

- Money is never optimistic. Checkout, authorize, sync, resolve and clock moves still show their result only after the server answers.
- The design is square. Nothing gained rounding.
- No new dependencies. Everything below uses React, Next, MUI and RTK Query already in the project.
- The `/pay` route stays light: the changes add 1.2 KB gzip to it (measured, see Performance).

## Results

| # | Feature | Initial Status | Action Taken | Final Status |
|---|---|---|---|---|
| 1 | Skeleton Loaders | Partial | The rule reader already had a skeleton. Added a shared `Skeleton` component (`Bone`, `Stack`, one shimmer in the text colour, so it works on white, dark and the sky band) and screen skeletons sized to the real content: the plans table (three rows at the table's 3.5 rem row height, in the table's own frame), the board (title, the four numbers, the schedule), the pay page (sky band with name, title and amount, then the sheet) and the route-level `plans/loading.tsx`. The rule reader now reuses the shared shimmer. Reduced motion stops the sweep (global rule). *Verified in a browser* on `/pay` and `/plans`. | Complete |
| 2 | Optimistic Updates | Partial | The assistant already shows the question at once and the reply when it comes. Added the rollback: a failed question goes back into the box so it can be sent again. Dismissing a proposal, picking a person and switching theme are local and instant. Every money action stays server-confirmed by rule. | Complete |
| 3 | Command Menu | Missing | Added `features/command/components/CommandMenu`: Ctrl+K (⌘K on Apple keyboards) on every organizer screen, plus a Search button in the header and the phone menu. Lists Plans, each confirmed plan, theme switch, Reset demo data (still asks first) and Sign out. Combobox over a listbox: type to filter, arrows wrap, Enter runs, Escape closes, focus returns to where it was. The palette code loads in its own chunk, fetched after the page is up so the first Ctrl+K opens at once. No open animation (a keyboard tool used often should feel instant). *Verified in a browser*: open, filter, Enter, theme applied, dialog closed. | Complete |
| 4 | Shortcut Hints | Missing | The Search button shows the shortcut (`Ctrl K`, or `⌘K` on Apple devices after hydration) and carries `aria-keyshortcuts`. The hint hides on devices with no hover (usually no keyboard). Ctrl+K is the only app shortcut, so there is nothing to conflict with inside the app; it is `preventDefault`ed over the browser's own Ctrl+K. | Complete |
| 5 | Undo Toasts | Missing | Not applicable. The app has no reversible non-money action to undo: holds, captures, releases and clock moves must never be undone from the UI; Reset demo data deletes server data and is already behind a confirm dialog; sign-out ends the session. There is no delete, archive or dismiss of stored data. Adding toasts with nothing to undo would be decoration. | Not Applicable |
| 6 | Stale-While-Revalidate | Partial | RTK Query already showed cached data while refetching, and the board and pay page stay live through Socket.IO with a polling fallback. Added revalidation on tab focus and on reconnect (`refetchOnFocus`, `refetchOnReconnect` in `baseApi`, `setupListeners` in `Providers`). A failed refetch keeps the last good data on screen. Reads only. | Complete |
| 7 | Pre-rendering | Present | Verified from `next build`: `/`, `/login`, `/signup` and `/plans` are static (prerendered); `/pay/[shareId]` and `/plans/[id]` render on demand because they read the path, and their data is personal, so it stays client-fetched behind skeletons. The landing and auth shells are server components. No change needed. | Complete |
| 8 | BlurHash Placeholders | Missing | Not applicable. The app has no raster images: the logo, icon and landing art are inline SVG and CSS. Nothing to blur. | Not Applicable |
| 9 | View Transitions | Missing | Added the cross-document rule (`@view-transition { navigation: auto }`) inside `prefers-reduced-motion: no-preference`, so full page loads inside the app cross-fade where supported and load as before elsewhere. In-app navigation is client-side, so most moves do not use it. Client-side view transitions need Next's experimental `viewTransition` flag and React's canary `ViewTransition`; that was deliberately not switched on one week before submission (see FE-070). Major state changes already animate in place (status pop, rise on new pay-page messages, the person popup). | Partial |
| 10 | Swipe-to-Dismiss Sheets | Missing | Not applicable. There are no bottom sheets or drawers. The phone menu drops down from the header and closes on tap, Escape or link follow; the person popup is a centred dialog closed by ×, Escape or a tap outside. Turning either into a swipe sheet would be a redesign. | Not Applicable |
| 11 | Interruptible Animations | Present | Audited every `transition` and `animation`. Interactive state (buttons, the menu icon, the meter, table rows, the theme toggle) uses CSS transitions, which retarget mid-flight. Keyframes are used only for one-shot entrances (rise, pop, word reveal) and loops (spinner, shimmer, live dot), never on a state that can reverse. The phone menu opens with a keyframe and closes at once, so a quick tap-tap cannot queue anything. No change needed. | Complete |
| 12 | Predictive Back | Partial | Browser history already worked: every page is a real route, the pay page drops PayPal's query with `replaceState` only after a real answer, and the hold flow survives Back. The one unsaved input that mattered, the pasted chat, was lost on Back or reload. It is now kept in this tab's session storage until the plan has been read (`features/rules/useDraft.ts`), and forgotten once it has. Android's predictive-back preview is a browser feature for history navigation and works with the routes as they are. *Verified in a browser*: typed, reloaded, the text and count came back, no hydration warning. | Complete |
| 13 | Hit Slop | Partial | Primary buttons were already 44 px. On touch screens (`pointer: coarse`) small buttons, link buttons, the theme toggle, the board's person picker, the assistant's input and the board's Copy link / Open link cell buttons now grow to 44 px. The popup's × keeps its 36 px square and gets a 44 px target through a pseudo-element; the "Use the sample cabin chat" text button gets the same. One shared `COARSE` / `TOUCH_TARGET` pair in `theme/media.ts`. *Verified in a browser* at 375 px with touch emulation: header and footer controls measure 44 px. | Complete |
| 14 | Safe Area Insets | Missing | Added `viewport-fit=cover` and made every edge that touches the screen respect the insets: content gutters use `max(gutter, env(safe-area-inset-left/right))` (`--gutter-l`, `--gutter-r` in tokens), as do the sign-in and pay columns; the footer adds the bottom inset for the home indicator. Full-width colour bands still bleed to the edge. The top inset stays 0 in a browser tab, so the sticky header is unchanged (no PWA manifest). *Verified in a browser*: 16 px gutter unchanged at 375 px. Notch behaviour needs a real iPhone in landscape. | Complete |
| 15 | One-Time Code Autofill | Missing | Not applicable. Foldback has no OTP or verification step: sign-in is email and password, guests need neither, and PayPal's own approval happens on PayPal. Existing auth fields already carry the right `autocomplete` tokens (`email`, `current-password`, `new-password`, `name`). | Not Applicable |
| 16 | Tabular Numbers | Partial | Money, the pay amount and step numbers already had it. Added `tabular-nums` to every table (plans list), the board's four numbers (counts, money, the countdown), the pay page's held count and the rule reader's character count. Prose keeps proportional figures. | Complete |
| 17 | Balanced Headlines | Partial | `h1`, `h2` and the hero were balanced and paragraphs used `pretty`. Added `text-wrap: balance` to `h3`. No `h4` is used. | Complete |
| 18 | Continuous Corners | Present | Audited radii: controls are square by a global `border-radius: 0`, panels use `--r-panel` (8 px), tags `--r-tag` (3 px), and the person popup is square by the user's choice. Consistent. `corner-shape: squircle` was considered and not added: it makes 8 px corners read tighter, changing the look, and only Chromium supports it. One inconsistency recorded as FE-004 (a bordered card inside a bordered card in the assistant). | Complete |
| 19 | Idempotency Keys | Present | The server side is complete and Manveer's area: every PayPal call carries a per-object key (`fb-order-{share}-{attempt}`, `fb-auth-{order}`, `fb-capture-{auth}`, `fb-void-{auth}`), the operation log is written before the call, and a second checkout returns the same link. Frontend side verified: money buttons disable while their request runs, the PayPal return runs once per page (ref guard, StrictMode-safe) and drops the token only after a real answer, and the Paused banner checks then resolves in order. Fixed one gap: the Hold button went idle between the server's answer and the browser leaving for PayPal; it now stays busy until the page unloads, and is ready again if Back restores the page from cache. | Complete |
| 20 | Amazon Safe Triangle | Missing | Not applicable. The principle keeps a hover-opened submenu open while the pointer travels diagonally toward it. Foldback has no hover menus or submenus: the desktop nav is flat links, the phone menu opens on tap, and the command menu is keyboard-first. If a hover submenu is ever added, open it on click, or keep it open while the pointer is inside the triangle from the pointer to the submenu's near edge. | Not Applicable |

## Summary of implemented improvements

Skeletons on every data screen; revalidation on focus and reconnect; the assistant's failed question returns to the box; a Ctrl+K command menu with its shortcut shown; cross-document view transitions; the pasted chat survives Back and reload; 44 px touch targets on touch screens; safe-area insets; tabular numbers where numbers change; balanced `h3`; the Hold button stays busy while leaving for PayPal. Found along the way and fixed: focus rings now show in Windows forced-colours mode (FE-041), and the command menu's field has a visible focus mark.

## Modified and new files

New:
- `frontend/src/components/Skeleton/{index.tsx,styled.ts,index.test.tsx}`
- `frontend/src/features/command/components/CommandMenu/{index.tsx,Palette.tsx,styled.ts,index.test.tsx,Palette.test.tsx}`
- `frontend/src/features/rules/{useDraft.ts,useDraft.test.ts}`
- `frontend/src/hooks/useClientValue.ts`

Modified:
- `frontend/jest.setup.ts` (session storage cleared between tests)
- `frontend/src/api/baseApi.ts`, `frontend/src/components/Providers/index.tsx` (revalidation)
- `frontend/src/app/globals.css` (view transitions, `h3` balance), `frontend/src/app/layout.tsx` (`viewport-fit`), `frontend/src/theme/tokens.css` (safe-area gutters), `frontend/src/theme/media.ts` (touch target constants)
- `frontend/src/app/plans/loading.tsx`, `frontend/src/features/board/components/Board/{index.tsx,styled.ts}`, `frontend/src/features/pay/components/PayScreen/{index.tsx,styled.ts,index.test.tsx}`, `frontend/src/features/rules/components/PlansList/{index.tsx,styled.ts}`, `frontend/src/features/rules/components/RuleScreen/{index.tsx,styled.ts}`
- `frontend/src/components/{Button,DataTable,Footer,Page,ThemeToggle}/styled.ts`, `frontend/src/features/auth/components/AuthShell/styled.ts`, `frontend/src/features/board/components/{PersonCard,SchedulerPanel}/styled.ts`
- `frontend/src/features/assistant/components/AssistantCard/{index.tsx,styled.ts,index.test.tsx}`
- `frontend/src/features/auth/components/AppHeader/index.tsx` (command menu)
- `frontend/src/lib/status.ts` (draft statuses in one place, used by the plans list and the command menu)

## New dependencies

None.

## Build, lint and test results

In `frontend/`, after the last change:

| Gate | Result |
|---|---|
| `yarn format:check` | Pass |
| `yarn typecheck` | Pass |
| `yarn lint` | Pass, 0 warnings |
| `yarn knip` | Pass |
| `yarn dup` | 0 clones |
| `yarn test` | 44 suites, 215 tests, all pass (was 40 suites, 203 tests before this work) |
| `yarn build` (with `NEXT_PUBLIC_API_URL` set) | Pass; static: `/`, `/login`, `/signup`, `/plans`; dynamic: `/pay/[shareId]`, `/plans/[id]` |

JS each route loads, gzip of the scripts in the served HTML, `main` against this branch:

| Route | main | review-nishit | Change |
|---|---|---|---|
| `/` | 247.8 KB | 248.6 KB | +0.8 KB |
| `/login` | 258.3 KB | 256.6 KB | −1.7 KB |
| `/signup` | 258.6 KB | 256.8 KB | −1.8 KB |
| `/pay/[shareId]` | 255.1 KB | 256.3 KB | +1.2 KB |

All routes were over their budget before this work (FE-060, FE-061). These numbers are `gzip -9` of the raw chunks, not Lighthouse's transferred bytes (Vercel serves Brotli, which is smaller), so they compare branches, not the budget itself.

## Not applicable, and why

Undo toasts (nothing reversible that is not money), BlurHash (no raster images), swipe-to-dismiss (no sheets or drawers), one-time codes (no OTP flow), Amazon safe triangle (no hover submenus). View transitions are partial on purpose (FE-070).

## Remaining issues and manual checks

- **Board on a preview deploy** (Bryntum is not run on this machine): skeleton → board, 44 px Copy link / Open link on a phone, the person popup's × target, the command menu on the board.
- **Real iPhone in landscape**: content clears the notch, the footer clears the home indicator.
- **Windows High Contrast**: focus rings visible on buttons.
- **Signed-in flows**: the local check used a placeholder cookie, so the plans list showed its error state, not real plans. The command menu's plan list is covered by tests, not by a browser.
