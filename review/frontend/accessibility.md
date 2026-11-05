# Frontend: accessibility (WCAG 2.2 AA)

Method: the `better-accessibility` checklist run over `frontend/src` (patterns: `outline: none`, click handlers on non-buttons, positive `tabindex`, disabled submits, live regions, images, viewport scaling, drag), then a keyboard and touch-size check on a local production build. No screen reader was run and no contrast pair was measured in this audit; both are listed as Needs Verification.

What already holds:
- One `<main>` per page and a skip link first in the tab order.
- Every control is a native button, link, input or select, with no positive `tabindex` anywhere.
- Status is always a word, never colour alone (`StatusTag`), so 1.4.1 holds.
- A global `prefers-reduced-motion: reduce` rule stops animation, and the scroll scenes skip their listeners.
- Labels are bound to inputs, with correct `autocomplete` tokens.
- The viewport allows zoom.
- The board's chart is mouse-driven, but "Show a person" opens the same popup from the keyboard.
- `scroll-padding-top` keeps focused elements clear of the sticky header (2.4.11).

The person popup's whole-card live region is recorded once, as FE-035 in `money-ui.md`.

## [FE-040] The schedule's Copy link / Open link buttons: keyboard reach not verified

- Category: Keyboard (2.1.1)
- Severity: Medium
- Status: Needs Verification
- File: `frontend/src/features/board/components/SchedulerPanel/FoldbackScheduler.tsx`
- Code Location: the "Pay link" column renderer and `onCellClick`
- Description: The buttons live inside Bryntum grid cells. Bryntum moves focus between cells with arrow keys; whether Tab or Enter reaches the inner `<button>`, and whether Enter triggers the copy (handled in `onCellClick`), was not checked (Bryntum does not run on this machine).
- Current Implementation: the person popup (reachable from "Show a person") has the same Copy and Open actions, so a keyboard path exists.
- Problem: unknown for the in-grid buttons.
- Why It Matters: the keyboard path exists, so this is Medium, not High.
- Recommended Solution: on a preview deploy, Tab into the grid and try. If Enter on a focused cell does nothing, handle `cellKeyDown` for Enter/Space on the Pay link column the same way as `onCellClick`.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: a deployed board.
- Verification Method: keyboard-only walk on the deployed board.

## [FE-041] Focus rings disappeared in Windows forced-colours mode

- Category: Focus visible (2.4.7)
- Severity: Medium
- Status: Implemented (fixed on `review-nishit`)
- File: `frontend/src/components/Button/styled.ts`
- Code Location: `"&:focus-visible": { outline: "2px solid transparent", outlineOffset: "2px", boxShadow: "var(--focus-ring)" }`
- Description: Buttons drew focus with `box-shadow` and `outline: none`. Forced-colours mode removes shadows, so keyboard users in High Contrast saw no focus at all.
- Current Implementation: a transparent outline is invisible normally and drawn in the system colour under forced colours.
- Problem: none left for buttons. `Field` inputs use an underline that is a pseudo-element with a background colour; check it under forced colours too.
- Why It Matters: every action in the app is a `Button`.
- Recommended Solution: done for buttons; verify fields.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: Windows, Settings → Accessibility → Contrast themes, Tab through `/login` and a board.

## [FE-042] Error messages are inserted as alerts

- Category: Status messages (4.1.3)
- Severity: Low
- Status: Partially Implemented
- File: `frontend/src/components/FormError/index.tsx`
- Code Location: `error ? <Message role="alert">…</Message> : null`
- Description: Errors appear as a newly inserted `role="alert"`. Most screen readers announce inserted alerts, but support varies, and field errors are not tied to their field with `aria-describedby`.
- Current Implementation: one alert under the form or action.
- Problem: inconsistent announcement; no field-level `aria-invalid`.
- Why It Matters: sign-in and sign-up errors are the most common.
- Recommended Solution: keep an empty `role="alert"` container mounted and fill its text; for field-specific API errors (email taken, password too short), set `aria-invalid` and `aria-describedby` on the field.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: NVDA on `/signup` with a taken email.

## [FE-043] The person popup's accessible name is just "Person"

- Category: Names (4.1.2)
- Severity: Low
- Status: Missing
- File: `frontend/src/features/board/components/PersonCard/index.tsx`
- Code Location: `<h2 id="person-title">Person</h2>` used as the dialog's `aria-labelledby`
- Description: Every popup is announced as "Person, dialog".
- Problem: the screen-reader user has to read on to learn whose card it is.
- Why It Matters: small.
- Recommended Solution: label the dialog with the person's name (`aria-labelledby` pointing at the name, or `aria-label={share.display_name}`).
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: screen reader on the board.

## [FE-045] Touch targets

- Category: Target size (2.5.8 AA, 44 px heuristic)
- Severity: Low
- Status: Implemented (fixed on `review-nishit`)
- File: see `ui-ux-20-points.md`, item 13.
- Code Location: `theme/media.ts` `COARSE`, `TOUCH_TARGET`
- Description: 2.5.8 AA (24 px) was already met everywhere checked; on touch screens controls now reach 44 px.
- Current Implementation: measured 44 px for header and footer controls at 375 px with touch emulation.
- Problem: none left.
- Why It Matters: friends pay on phones.
- Recommended Solution: done.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: browser measurement.

## [FE-046] The command menu's field had no focus mark

- Category: Focus visible (2.4.7)
- Severity: Low
- Status: Implemented (fixed on `review-nishit` before it shipped)
- File: `frontend/src/features/command/components/CommandMenu/styled.ts`
- Code Location: `Input`
- Description: Found while auditing the new palette.
- Current Implementation: a 2 px focus-coloured rule under the field and a transparent outline for forced colours.
- Problem: none left.
- Why It Matters: 2.4.7.
- Recommended Solution: done.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: open with Ctrl+K and look.

## [FE-047] Contrast, 200 % zoom and screen readers

- Category: Verification gap
- Severity: Medium
- Status: Needs Verification
- File: `frontend/src/theme/tokens.css` and every screen
- Code Location: —
- Description: Not measured in this audit:
  - Contrast pairs (1.4.3, 1.4.11) in light and dark: especially `--text-3` captions, the sun gradient with black text, and white text on sky.
  - 200 % zoom and 320 px reflow (1.4.4, 1.4.10).
  - An NVDA or VoiceOver walk.
- Current Implementation: the spec requires Lighthouse accessibility ≥ 95 on every route, but nothing runs Lighthouse (see FE-064).
- Problem: unverified.
- Why It Matters: accessibility is part of Design for every judge.
- Recommended Solution: run Lighthouse (mobile and desktop) on each public route of the deployed site; Ravi records site-wide scores in `misc/` (cross-reference his MI IDs); fix any pair below 4.5:1 for text and 3:1 for UI boundaries.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Ravi (site-wide scores).
- Verification Method: Lighthouse, a contrast checker, browser zoom to 200 %.
