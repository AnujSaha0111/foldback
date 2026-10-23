# UI

Three screens. Desktop width 1280 is the demo width. The video is recorded at that width. Do not spend the phase 7 polish budget on a marketing site.

Type is the system UI stack. Background is off-white, text near-black, status colors only on the scheduler events and a small status pill that also contains the status word.

## Navigation

- `/` Rule screen
- `/board/:contractId` Board screen
- `/checkout/:contractId/:shareId` Checkout screen

The Rule screen lists existing contracts under the paste box so a judge can open `cabin-hold` and `print-full` without pasting. Each row shows title, status word, and held count.

App header: `Foldback` and the line `A group payment is kept only if the headcount is met. Otherwise every share is refunded.`

## 1. Rule screen

Textarea label: `Group rule`

Placeholder:

Use the cabin rule paste from `demo.md` as the placeholder, character for character.

Primary button: `Read the rule`

After a complete extraction, show a definition list:

- Title
- Total
- Share
- Headcount
- Deadline, formatted in Pacific time with the zone abbreviation
- Grace, or the sentence `No grace. Everyone is held to the same deadline.`
- People

Under each money and time row, show the evidence quote in quotation marks when one exists.

Primary button: `Confirm these terms`

Helper under the button, the confirm copy from `ai.md`.

On `needs_clarification`, show the question and leave the textarea filled. Do not show the confirm button.

There is no field-by-field editor.

## 2. Board screen

Left: the scheduler, at least 70 percent of the width. Right: a detail panel.

Above the scheduler:

- Title
- Status pill with the contract status word (`Active`, `Grace`, `Kept`, `Refunded`, `Blocked`, and the other statuses in plain words: `Awaiting confirmation` is not shown here because confirm navigates to the board only after `active`)
- Sentence: `{held_count} of {headcount} held`
- `resolution_reason` when non-null
- Demo clock: `Now` plus the formatted `demo_now`
- Buttons from `scheduler.md`

Plain words for contract status:

| Status | Label |
|---|---|
| `active` | Active |
| `grace` | In grace |
| `locked` | Kept |
| `unwinding` | Refunding |
| `unwound` | Refunded |
| `blocked` | Blocked |

Detail panel for the selected person:

- Name
- Share amount in dollars
- Status word matching the event name
- Badge `Sample — no PayPal capture` or `Sandbox`
- Capture id or `No capture yet`
- Refund id or `No refund`
- Button `Pay this share` when checkout is allowed

Empty selection: `Select a person on the schedule.`

Blocked banner, full width, when status is `blocked`: `A PayPal result is unknown, so Foldback will not lock or refund again until you press Check payment.` The button calls sync on each unknown share, then resolve.

## 3. Checkout screen

Shows the person, the amount, and the contract title.

If the URL has `token` and not `cancelled`, call capture immediately and show `Confirming with PayPal…` then the outcome:

- Completed: `Paid. Capture {id}.` and a link `Back to the board`
- Unknown: `PayPal did not return a clear result. This share stays reserved.` and `Back to the board`
- Failed: the API `message`

If `cancelled=1`, call sync with `buyer_cancelled: true` and show `Checkout closed. No payment was captured.`

Do not render a card form. The PayPal window is the buyer approval. For the first hop, `Pay this share` on the board navigates the browser to `approve_url` (full page, not an iframe).

## Dollars

Format cents with `Intl.NumberFormat` `en-US` currency USD. Never do `cents / 100` string concatenation that drops the trailing zero. `$80.00` is the cabin share.

## Reset

The reset control sits in the header as a text button `Reset demo data`. Confirm with `window.confirm` using the warning sentence from the reset API. After reset, navigate to `/`.

## Copy bans

Do not write: escrow, guaranteed, bank, wallet, AI decided the price, or smart contract. The allowed explanation of the model is one line on the Rule screen after extraction: `These fields were read from your rule. They are not active until you confirm them.`

## Loading and errors

Buttons disable while a request is in flight. Failures show the API `message` under the button. Do not toast a stack trace.

## Demo clock labels

`Advance to deadline` and `Advance to grace end` show the target timestamp in the button title attribute and in visible helper text so a recording makes the jump obvious: `Moves Now to Fri 6 Nov, 6:00pm PT`.
