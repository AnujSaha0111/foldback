# Frontend: the money UI

Scope (frontend side only): the Pay page (`features/pay`), the return from PayPal, cancel, unknown-result handling, and the board's Controls, Paused banner, person popup and Assistant card. The server side of every money call is Manveer's area (BE findings).

The rule checked everywhere: **the UI never says money moved before the server says so.**

## [FE-030] No screen claims a hold, capture or release before the server confirms it

- Category: Money UI
- Severity: Informational
- Status: Implemented
- File: `PayScreen/index.tsx`, `payView.ts`, `useReturnFromPayPal.ts`, `Controls/index.tsx`, `AssistantCard/index.tsx`
- Code Location: whole flow
- Description: Checked each step:
  - The Hold button only fetches a PayPal link.
  - On return the page shows "Confirming with PayPal…" and hides the status tag (the share reads unknown by design during the call).
  - The hold id shows only from the authorize answer.
  - Every status word comes from the server's share.
  - The clock and Resolve buttons show a spinner, then whatever the server's plan says.
  - Assistant proposals do nothing until approved, then go through the normal routes with `?via=agent`.
- Current Implementation: verified in code and by the PayScreen, Controls and AssistantCard tests.
- Problem: none.
- Why It Matters: it is the product's promise.
- Recommended Solution: keep. No optimistic updates or undo were added to any of these (see `ui-ux-20-points.md`).
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: tests, and the user's production runs of hold, cancel, keep and release.

## [FE-031] The Hold button went idle while the browser left for PayPal

- Category: Double submit
- Severity: Low
- Status: Implemented (fixed on `review-nishit`)
- File: `frontend/src/features/pay/components/PayScreen/index.tsx`
- Code Location: `HoldButton`, `leaving` state and the `pageshow` listener
- Description: After checkout answered, the button went back to "Hold my share" for the second or two PayPal's page took to load. A second tap asked for checkout again (the server returns the same link, so no new order, but it is confusing).
- Current Implementation: the button stays busy until the page unloads; if Back restores the page from the browser's cache, `pageshow` makes it ready again.
- Problem: none left.
- Why It Matters: a friend on a slow phone taps twice.
- Recommended Solution: done.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none; no request changed.
- Verification Method: new PayScreen test ("stays busy while the browser leaves for PayPal, and is ready again after Back").

## [FE-032] Resolve now acts without saying what it will do

- Category: Money UI, confirmation
- Severity: Medium
- Status: Missing
- File: `frontend/src/features/board/components/Controls/index.tsx`
- Code Location: the `Resolve now` button
- Description: Resolve applies the rule at the demo clock's time. If everyone is held it captures every hold; past the deadline with someone missing it releases every hold. Both are final. The button's caption says only "Applies the rule at the current time."
- Current Implementation: one press, no preview, no confirm.
- Problem: an organizer (or a judge clicking around) cannot tell which way it will go before pressing. The money is sandbox, but the product teaches that this is final.
- Why It Matters: a confirm that names the outcome ("Capture 4 holds, $320" or "Release 3 holds") is the clearest way to show the engine is deterministic; the assistant's `simulate_outcome` already computes it server side.
- Recommended Solution: on press, show a small confirm with the outcome. Get the outcome from a read-only server answer (a dry run of `decide`), never computed in the browser. Needs a backend read endpoint or reuse of the agent tool; coordinate with Manveer.
- Implementation Complexity: Medium
- Breaking Change Risk: Low
- Dependencies: Manveer (BE), possibly Ravi (the simulate tool, AI area).
- Verification Method: Controls test; demo run on a preview deploy.

## [FE-033] Check payment hides a failed sync

- Category: Error handling
- Severity: Low
- Status: Partially Implemented
- File: `frontend/src/features/board/components/Controls/index.tsx`
- Code Location: `Paused.check`
- Description: Same as FE-014. Listed here because it is on the money screen.
- Current Implementation: sync results are ignored; only the resolve error shows.
- Problem: a paused plan stays paused with no reason shown.
- Why It Matters: trust in the one state that worries people.
- Recommended Solution: see FE-014.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: see FE-014.

## [FE-034] The pay page says "Sandbox" before it knows

- Category: Copy, loading state
- Severity: Low
- Status: Missing
- File: `frontend/src/features/pay/components/PayScreen/index.tsx`
- Code Location: `<Badge>{data?.money_source === "sample" ? "Sample" : "Sandbox"}</Badge>`
- Description: While the share loads, `data` is undefined, so the badge says "Sandbox", then flips to "Sample" on sample plans.
- Current Implementation: badge always rendered.
- Problem: a visible flip on the first screen a friend sees.
- Why It Matters: small, but it is the badge that explains which money is involved.
- Recommended Solution: render the badge only when `data` exists.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: open a sample plan's pay link on a slow connection.

## [FE-035] The person popup re-announces the whole card on every live update

- Category: Accessibility on the money screen
- Severity: Medium
- Status: Missing
- File: `frontend/src/features/board/components/PersonCard/index.tsx`
- Code Location: `<Root aria-labelledby="person-title" aria-live="polite">`
- Description: The whole card is a live region. Socket refetches re-render it, so a screen reader can read the full card again whenever the plan changes.
- Current Implementation: polite live region on the dialog content.
- Problem: noisy, and it competes with the dialog's own announcement.
- Why It Matters: WCAG 4.1.3 wants status messages announced, not whole regions repeated.
- Recommended Solution: remove `aria-live` from `Root`; put a small `role="status"` region around the status tag only.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: NVDA or VoiceOver with the popup open while a friend pays.
