# Frontend: responsiveness

Method: read every layout's media queries and grid tracks, then load the local production build at 375 × 812 with touch emulation and at desktop width. The board was not loaded locally (Bryntum).

What holds:
- Gutters step from 16 px to 24 px to 32 px with the viewport.
- Grids use `minmax(0, 1fr)`, so long names do not force overflow.
- `overflow-x: clip` on `html` and `body`, and wide tables scroll inside their own frame.
- The header collapses into a menu under 900 px.
- The pay page is a single 480 px column built phone-first.
- The auth forms and the landing hero fit one screen, as the spacing rule demands (checked by the user earlier).

## [FE-050] Content could sit under a notch in landscape

- Category: Safe areas
- Severity: Low
- Status: Implemented (fixed on `review-nishit`)
- File: `layout.tsx`, `tokens.css`, `Page/styled.ts`, `AuthShell/styled.ts`, `PayScreen/styled.ts`, `Footer/styled.ts`
- Code Location: `viewportFit: "cover"`, `--gutter-l`, `--gutter-r`, footer `paddingBottom`
- Description: See `ui-ux-20-points.md`, item 14.
- Current Implementation: insets respected on every edge that touches the screen.
- Problem: none left.
- Why It Matters: friends open pay links on iPhones.
- Recommended Solution: done.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: real iPhone in landscape.

## [FE-051] The board on a phone

- Category: Responsiveness
- Severity: Medium
- Status: Needs Verification
- File: `Board/*`, `SchedulerPanel/*`
- Code Location: —
- Description: The board is an operator screen (spec: desktop first). On a phone the Bryntum chart is narrow; the Person column (180 px) and the Pay link column (220 px) take most of a 375 px screen before any day appears.
- Current Implementation: the chart scrolls inside its frame; the popup works on phones; the header fix from earlier testing is in.
- Problem: on a phone the time axis is mostly off screen.
- Why It Matters: judges may open the live demo on a phone.
- Recommended Solution: under 600 px, hide the Pay link column (the popup has the same actions) and narrow the Person column to about 120 px, through Bryntum's column `hidden` / `width` per breakpoint.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: a deployed board to check.
- Verification Method: the deployed board at 375 px.

## [FE-052] The pay page at 375 px

- Category: Responsiveness
- Severity: Informational
- Status: Implemented
- File: `PayScreen/*`
- Code Location: —
- Description: The skeleton, error state and footer were checked at 375 × 812: no horizontal scroll, the amount scales with `clamp`, and touch targets are 44 px.
- Current Implementation: verified in a browser (local production build; the API refused localhost, so the loaded share itself was not seen).
- Problem: none.
- Why It Matters: the page friends see.
- Recommended Solution: keep.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: browser screenshot at 375 px.

## [FE-053] 320 px and 200 % zoom

- Category: Reflow (1.4.10)
- Severity: Low
- Status: Needs Verification
- File: every screen
- Code Location: —
- Description: Not checked in this audit.
- Current Implementation: layouts use `minmax(0, 1fr)`, wrapping flex rows and `clamp` sizes, which usually reflow.
- Problem: unverified.
- Why It Matters: WCAG AA.
- Recommended Solution: check `/`, `/login`, `/plans`, a board and a pay link at 320 px wide.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: browser at 320 px, and 1280 px at 200 % zoom.
