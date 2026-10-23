# Phase 4 — Capture

Budget: 6 hours. Owner: PayPal owner. Depends on phase 3.

## Read

- `paypal.md`
- `api.md` Checkout, Capture, Sync
- `architecture.md` failure table for capture
- `ui.md` Checkout screen
- `test.md` cases marked phase 4

## Goal

A confirmed sandbox share can be approved by the buyer and stored as `captured` with a real capture id. The board reloads that share as `Held`. A second checkout is rejected. A lost capture response reserves the share.

## Do not

- Do not refund in this phase.
- Do not lock when headcount is met. Leave the contract `active`. Phase 6 adds that call.
- Do not capture `sample` rows. Return `409 sample_row`.
- Do not send an amount from the browser.
- Do not log the access token.

## Create

```text
app/server/src/paypal/client.ts
app/server/src/paypal/ops.ts
app/server/src/routes/shares.ts
app/client/src/screens/CheckoutScreen.tsx
app/server/test/capture.test.ts
```

Implement create order, capture, and get order as `paypal.md` specifies. Persist `paypal_operations` in the same transaction that moves the share into `checkout_open` or `capture_unknown`.

`Pay this share` is shown only when the share is `sandbox` and `waiting` or `declined`, and the contract is `active`. It navigates to `approve_url`.

Checkout screen behavior matches `ui.md`, including `buyer_cancelled`.

After a completed capture, the client returns to the board and the event name is `Held`.

Mock `fetch` in tests. One manual sandbox capture is still required for the exit, using a contract created by confirm or by a test-only insert route. Do not add a test-only route if confirm already exists from phase 2. If phase 2 is unfinished, insert one `active` sandbox contract with a SQL helper in the spike script's successor `app/server/src/spike/insert-sandbox-contract.ts` and delete that helper in phase 6 if confirm exists. Prefer waiting for phase 2 if it is in progress the same day.

## Exit check

Tests:

- Sample checkout returns `409 sample_row` and does not call fetch.
- First checkout stores an order id and `checkout_open`.
- Capture success stores the capture id and status `captured`.
- Second checkout returns `409 share_already_captured`.
- Timeout leaves `capture_unknown`, and another checkout returns `409 money_unknown`.
- Sync on a `COMPLETED` order moves `capture_unknown` to `captured`.
- Boot helper rejects `PAYPAL_ENV=live`.

Manual: one sandbox buyer approval, then the board shows `Held` and the capture id in the detail panel. Write the capture id in the exit note.

## Exit note

Manual capture id:
