# UI

This file defines screens, flows, states, and copy. **The visual design (layout style, colors, type, components) is decided in phase 2.** The user brings reference screenshots and picks a template, and the result is recorded in the "Visual design" section at the end of this file and in `frontend/src/theme`. Until then, nothing here prescribes a look.

Built with Next.js 16 App Router, MUI 7, and Redux Toolkit (RTK Query). Organizer screens target 1280 px desktop width (the video width) and must still work at 768 px. The Pay page is mobile-first (375 px), because friends open pay links on their phones.

Rules that hold whatever the visual design:

- Status is never shown by color alone. Every pill and event carries its word.
- Every interactive control has a visible label, and keyboard focus is visible.
- Text contrast is WCAG AA.

## Routes

| Route | Who | Rendering |
|---|---|---|
| `/` | everyone | Landing: pitch, a "How it works" strip, `Try it as a guest` (primary), `Sign in`, `Create account`. Server component |
| `/login`, `/signup` | visitors | Forms (client components). After success → `/plans` |
| `/plans` | signed-in organizer | Rule screen plus the plans list |
| `/plans/[id]` | signed-in owner | Board screen |
| `/pay/[shareId]` | anyone with the link | Pay page |

Organizer routes redirect to `/login?next=…` on `401`. A Next.js proxy (`src/proxy.ts`, the Next 16 name for middleware) checks only that the `fb_session` cookie exists; the API is the real authority.

App header on organizer screens: `Foldback`, the tagline `Nobody pays unless the group makes it.`, the user's name (with a `Guest · expires in N days` chip for guests), `Reset demo data`, and `Sign out`.

## 0. Landing, sign-in, sign-up

- Landing primary action: `Try it as a guest`. It calls `POST /api/auth/guest`, then goes to `/plans`. One line under it: `No sign-up. You get two sample plans and your own private workspace for 7 days.`
- Sign-in fields: Email, Password, the button `Sign in`, and the error `Email or password is incorrect.`
- Sign-up fields: Name, Email, Password (helper `At least 10 characters`), and the button `Create account`.
- Rate-limit errors show the API `message`.

## 1. Rule screen (`/plans`)

Textarea label `Paste the group chat or describe the plan`. Placeholder: the cabin sentence from `demo.md`. A small link, `Use the sample cabin chat`, fills the textarea with the cabin chat so a judge never has to type.

Primary button: `Read the plan`. While the request is in flight, the button reads `Reading…` and is disabled.

On a complete extraction, show a definition list. Each row shows the value, then the evidence quote in quotation marks, in a muted style:

- Plan (title)
- Each person pays (share) and Total
- People (the names, as chips)
- Deadline, for example "Fri 6 Nov 2026, 6:00pm PST", plus the quote, for example "everyone else by friday 6pm pacific"
- Grace: "Maya Shah until Mon 9 Nov 2026, 6:00pm PST", or `No grace. Everyone has the same deadline.`

Above the list, one line: `Read from your text. Nothing is active until you confirm.`

Primary button `Confirm these terms`, with the helper from `ai.md` beneath it. After confirming, navigate to `/plans/[id]`.

On `needs_clarification`: show the question in a callout, a single-line input labeled `Your answer`, and a button `Answer`. That calls clarify, then shows the new result. The textarea stays filled. No confirm button appears until the extraction is complete.

Below everything, a list titled `Plans`: confirmed contracts, because a reading nobody has confirmed has no people or board yet (title, status word, `{held} of {headcount} held`, a `Sample` or `Sandbox` badge). Each row links to its board.

## 2. Board screen (`/plans/[id]`)

Layout at 1280 px: the scheduler on the left (about 65%), a right column (about 35%) with two stacked cards: **Person** and **Assistant**.

Above the scheduler:

- Title, status pill, and badge `Sample` or `Sandbox`
- `{held_count} of {headcount} held` (plus `· {kept_count} kept` or `· {released_count} released` when non-zero)
- `resolution_reason` when non-null, in an `aria-live` region
- Demo clock: `Now: Fri 6 Nov, 4:00pm PT`
- Buttons from `scheduler.md`, each with helper text such as `Moves Now to Fri 6 Nov, 6:00pm PT`

Contract status words:

| Status | Label |
|---|---|
| `active` | Collecting |
| `grace` | In grace |
| `capturing` | Capturing |
| `kept` | Kept |
| `releasing` | Releasing |
| `released` | Released |
| `blocked` | Paused |

**Person card** (the selected share):

- Name, share amount, status word (same as the event name)
- Badge: `Sample — no PayPal hold` or `Sandbox`
- Authorization id or `No hold yet`; hold expiry when present
- Capture id, or `Released (VOIDED)`, or nothing
- `Copy pay link` (copies `{origin}/pay/{shareId}`) and `Open pay link`, shown when the share is sandbox and payable
- Empty selection: `Select a person on the schedule.`

**Assistant card**:

- A short message list and an input with the placeholder `Ask about this plan…`
- Three suggestion chips that send a message: `What happens if Maya doesn't pay?`, `Draft reminders for anyone unpaid`, `Move to the deadline`. Use the real unpaid person's name; hide a chip when it doesn't apply.
- Under each assistant reply, a muted line per tool call, for example `Simulated Mon 9 Nov, 6:00pm PT`, so judges can see the agent using tools.
- Drafts render as a quote block with a `Copy` button.
- Proposals render as cards with the label, the preview sentence, an `Approve` button, and `Dismiss`. Approve calls the route, refetches the board, and adds a system line `Approved: …`.
- On `agent_unavailable`, show the message from `ai.md`. Everything else keeps working.

**Paused banner** (status `blocked`), full width: `A PayPal result is unknown, so Foldback paused and sent nothing else. Check payment to continue.` The button `Check payment` calls sync on each unknown share, then resolve. For `capture_failed`, the banner shows the reason sentence instead and no button.

## 3. Pay page (`/pay/[shareId]`)

Mobile-first, a single column, max width 480 px.

Content, from `GET /api/shares/:shareId`. The page joins the `share:{id}` socket room, so the status updates live (for example, to Kept when the last friend pays):

- `{display_name}, your share for {title}`
- The amount, large: `$80.00`
- The condition in one sentence: `This is a hold, not a charge. It's only taken if all 4 people pay by Fri 6 Nov, 6:00pm PT. Otherwise it's released and you pay nothing.` For the grace subject: `…you have until Mon 9 Nov, 6:00pm PT.`
- Progress: `3 of 4 held` and the other names, with no one else's status (the API does not send it)
- Status-dependent action:
  - payable `waiting` or `declined`: button `Hold my share with PayPal`. Calls checkout, then navigates to `approve_url` (full page).
  - `checkout_open`: button `Continue in PayPal` (same call; the server returns the stored link).
  - `held`: `Your $80.00 is held. You'll only be charged if everyone pays.`
  - `kept`: `Everyone paid. Your share was captured.`
  - `released`: `The group didn't make it, so your hold was released. You were not charged.`
  - `capture_failed`: `PayPal refused this capture, so nothing was taken for your share.`
  - any `*_unknown` status: `PayPal did not return a clear result. Your share stays reserved while we check.`
  - `expired` or not payable: `The deadline passed before this share was held. Nothing was charged.`
  - `sample`: `This is a sample plan. No PayPal payment is possible.`

Return handling:

- URL has `token` (and no `cancelled`): call authorize immediately, show `Confirming with PayPal…`, then the result: completed → the held (or kept) message above, plus `Hold {authorization_id}`; unknown → `PayPal did not return a clear result. Your share stays reserved while we check.`; failed → the API `message`.
- URL has `cancelled=1`: call sync with `buyer_cancelled: true`, then show `Checkout closed. Nothing was held.` with the hold button again.
- Remove the query string with `history.replaceState` after handling it, so a refresh never re-posts.

No card form. The PayPal window is the approval.

## Dollars and dates

- Cents: `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`. `$80.00`, never `$80`.
- Times: the server sends ISO strings. Format them in the contract timezone with `Intl.DateTimeFormat` and `timeZone`, for example `Fri 6 Nov, 6:00pm PT`. Do not add a date library to the client. Helpers live in `src/lib/format.ts` and have unit tests.

## Reset

`Reset demo data` opens an MUI confirm dialog, loaded only when pressed, with the warning about existing sandbox holds. It resets only the signed-in user's plans. After a reset, navigate to `/plans`.

## Copy rules

Never write: escrow, guaranteed, bank, wallet, smart contract, or "AI decided."

Use these words: hold (an authorization), captured or kept, released (voided), not charged.

The model is described once on the Rule screen (`Read from your text…`) and once as the Assistant card title. The assistant never says it moved money.

## Loading and errors

A button in flight shows the Foldback spinner (three squares held, one to go, turning a quarter at a time) in place of its arrow, and takes no more presses until the next screen has arrived. A screen or section waiting on data shows the same spinner with a line of text. Failures show the API `message` under the button. No stack traces, no toasts.

## Demo clock labels

`Advance to deadline` and `Advance to grace end` show the target time in visible helper text (`Moves Now to Fri 6 Nov, 6:00pm PT`) so the recording makes the jump obvious.

## Visual design

Approved in phase 2, redesigned on 30 October 2026 to add warmth and depth. The mockups are plain HTML in `docs/design/` (open `index.html` through any static server, for example `python -m http.server --directory docs/design`). `tokens.css` is the source of truth; the MUI theme in phase 5 is generated from it.

**Direction.** IBM Carbon's structure (hairline rules, flat layers, filled inputs with a bottom rule, status as words) with PayPal's color and tone (sky blue, black, plain trust copy). No template and no copied code: built from scratch, inspired by ibm.com, IBM Quantum and paypal.com. Reference screenshots are not committed (third-party material).

**Rules.** Buttons, inputs and other controls are square. Panels have an 8 px radius and tags 3 px. The logo and the folded blocks stay sharp, because the fold is the brand. Panels are frosted glass (`.glass`), which needs colour behind it, so it sits on the sky hero or on the soft light behind the working screens, and it falls back to solid where blur is missing or `prefers-reduced-transparency` is set. One soft shadow, on floating panels only. One gradient, the orange one. No purple, emoji, serif, eyebrow labels, rounded icon boxes, or rows of identical feature cards. Real copy first. Plex Sans and Plex Mono only (the Plex Serif family is never loaded).

**Spacing.** Keep padding and gaps small: big values look generated. Most gaps use `--s-3` to `--s-5`; `--s-7` to `--s-9` are for rare, large separations, and section padding stays at or under about 4.5 rem. The landing hero fills the first screen under the header and shows its buttons and trust line without scrolling, and sign-in and create account show all their content in the first screen at 100% zoom (only the footer, with the theme toggle, may sit below the fold). Check every new screen at 1280 × 720.

| Token | Value | Use |
|---|---|---|
| Sky | `#60CDFF` | Hero and band backgrounds. Text on it is always black (11.7:1). White on sky fails, so it is never used |
| Sun | `#FFB547` to `#FF7A1A` to `#F2501E` | The accent, the true complement of sky. It marks the one thing that matters now: the main action, the share still open, the deadline. One orange action per view. The site footer is orange too, so every page ends on it. Text on it is always black (8.1:1 at the middle stop, 5.9:1 at the deep end). White on it fails, so it is never used |
| Warm | `#FFF3E6` | One soft band on the landing page. `#262626` in dark mode |
| Ink | `#000000` | Buttons, headlines on sky and on sun |
| Blue | `#0070E0` | Links, Held, focus ring. Text on white 4.8:1. Never as text on sky (2.7:1) |
| Navy | `#012169` | Phone scene, dark compare panel, logo flap |
| Grays | `#F4F4F4` `#E0E0E0` `#525252` `#161616` | Layers, hairlines, secondary text (7.9:1), body |
| Dark theme | `#161616` page, `#262626` layer, `#78A9FF` links | Toggle in the footer. Sky hero stays sky |
| Font | IBM Plex Sans 300/400/500/600, Plex Mono 400/500 | Display 600, headings 300, labels 500. Money, ids and times are mono with tabular numerals |
| Scale | display 40 to 72 px (fluid), h1 28 to 44, h2 22 to 32, body 16, small 14, caption 12 | `clamp()` so one scale serves phone, tablet and desktop |
| Space | 4 px base: 4, 8, 12, 16, 24, 32, 48, 64, 96 | Gutter 16 / 24 / 32 at phone / tablet / desktop |
| Motion | 110 ms and 200 ms state changes. On the landing page: the headline rises word by word, lights drift behind the glass, the panel tilts toward the cursor with a light on it, held tags pop, buttons lean toward the cursor, list rows rise in turn | All off under `prefers-reduced-motion`. Pointer effects need a real mouse. None on the Pay page. Only `transform` and `opacity` move, so it stays smooth |

**Status.** Always a word. Waiting gray fill, Held blue fill, Kept green fill (`#198038`), Released outlined gray, Failed red (`#DA1E28`), Needs attention yellow with black text. All pairs reach 4.5:1 or more. The board uses the same colors (see `scheduler.md`).

**Logo.** Two blocks, each with a folded corner: `Fold` in black on sky with the fold top-right (navy flap), `back` in white on black with the fold bottom-right (sky flap), a 0.1 em gap between the d and the b. Built in CSS (`.logo`), sized by `font-size`. Favicon: the sky "F" block with its fold (`favicon.svg`). In the dark theme the `back` block turns white with black text.

**Components.** Button (sun for the one main action, black, blue, secondary outlined, link; 48 px tall, arrow aligned right), field (label above, filled box, bottom rule, helper, error), status tag, chip, callout (info, warning), table (gray header, hairline rows), ruled step list, compare panel, nav (collapses to a menu under 900 px), footer, segmented control (mock only), person card, assistant card (messages, tool lines, draft, proposal), board (people rows, status bars, deadline, grace, now and proposed markers).

**Responsive.** Phone under 600, tablet 600 to 1023, desktop 1024 and up. Checked at 375, 768 and 1280: no horizontal page scroll. Board: at 1280 the schedule is about 65% wide with the Person and Assistant cards beside it; at tablet the cards sit side by side below it; at phone it stacks and the schedule scrolls inside its own frame. Pay: one column, max 480 px; "This is a hold, not a charge." and the action button are above the fold at 375 px.

**Theme.** Default light, with a toggle in the footer of every page (bottom right on desktop, like PayPal's footer controls; never in the header, never under the logo) to dark. It applies to every page and tab. The choice is remembered. The light logo is the approved one: `Fold` black on sky, `back` white on black. In dark mode the `back` block turns white with black text, which is accepted.

**Scroll scenes (landing only).** Like PayPal's site, large words move over illustrations as you scroll. Three scenes: (1) the section pins while `hold` and `don't pay`, the second in the orange gradient, slide in opposite directions behind a thin-bezel phone with a titanium band and a glass reflection. The phone turns to face you, then the last friend holds their share on its screen: Maya's tag flips to Held, the fourth square fills and the button becomes `Your $80.00 is held`. The phone is the real Pay page in HTML and CSS, so it scales as one piece; (2) four squares slide in from four sides and lock into a grid, the fourth left open; (3) an orange `Kept` block and a black `Released` block, each with a folded corner, slide together. The illustrations are drawn as SVG and CSS (no stock photos, no copyright, they follow the palette). `scroll.js` writes one number `--p` per scene and the CSS does the rest, with no library. `motion.js` handles the pointer effects the same way. Under `prefers-reduced-motion` every scene rests in its composed state, and the pinned scene stops pinning. Scroll motion is never used on the Pay page.

**PayPal.** The mockup uses our own orange button labelled `Hold my share with PayPal`. The official PayPal mark is added in phase 6 from PayPal's brand assets and is not restyled.

**Mockups.** `landing.html` (hold arrival animation), `signin.html` (sign in, error, create account), `plans.html` (empty, reading, clarify, confirm list, plans table), `board.html` (collecting, agent proposal with Approve and Dismiss, kept, released, paused), `pay.html` (waiting, checkout open, confirming, held, unknown, cancelled, kept, released, expired, sample).
