# HTTP API

Base path `/api`. JSON in and out. Errors use `{ "error": "<code>", "message": "<sentence>" }` and the status codes below. The client shows `message` and never branches on free text.

All money mutations re-read the share and contract inside a SQLite transaction before calling PayPal.

## Codes

| HTTP | `error` | When |
|---|---|---|
| 400 | `bad_request` | Missing body field |
| 404 | `not_found` | Unknown contract or share |
| 409 | `sample_row` | Checkout, capture, or refund on `money_source = sample` |
| 409 | `share_already_captured` | Second checkout or capture after a capture exists or is unknown |
| 409 | `contract_locked` | Checkout, capture, or refund after lock |
| 409 | `contract_terminal` | Mutation after `unwound` or `blocked`, other than `sync` and `reset` |
| 409 | `share_not_payable` | Deadline passed and this share is not the open grace subject |
| 409 | `refund_already_completed` | Refund route when status is `refunded` |
| 409 | `money_unknown` | A mutating call while this share, or any share on resolve, is `capture_unknown` or `refund_unknown` |
| 409 | `not_confirmed` | Checkout before status is `active` or `grace` |
| 422 | `needs_clarification` | Extraction missing a field or amounts disagree |
| 422 | `confirm_mismatch` | Confirm body does not match the stored extraction |
| 502 | `paypal_failed` | PayPal returned a definite 4xx business error. Share is unchanged except a declined checkout |
| 500 | `internal` | Bug. Do not catch and turn this into a success |

Unknown PayPal transport is not 502. The route returns 200 with the share in `capture_unknown` or `refund_unknown` and `outcome: "unknown"`. The money stays reserved.

## Health

`GET /api/health`

```json
{ "ok": true, "service": "foldback", "paypal_env": "sandbox" }
```

## Demo reset

`POST /api/demo/reset`

No body. Response:

```json
{
  "ok": true,
  "warning": "Local rows were cleared. Sandbox captures that already happened are still in PayPal until you refund them.",
  "contracts": ["cabin-hold", "print-full"]
}
```

`contracts` lists `seed_key` values, not the generated ids. The client reloads `GET /api/contracts`.

## List and read

`GET /api/contracts`

Returns `{ "contracts": [ ContractSummary ] }` sorted by `created_at`. Summary fields: `id`, `seed_key`, `title`, `status`, `headcount`, `paid_count`, `share_cents`, `currency`, `deadline_at`, `demo_now`, `resolution_reason`.

`paid_count` counts shares in `captured`, `locked`, `refund_pending`, `refund_unknown`, or `refunded` only for display of "how many captures exist." The resolve engine's `paid` count is narrower: `captured` or `locked` only. Document this split in the board subtitle so a refunded share is not shown as still paid. The summary field for "still held" is `held_count` (`captured` or `locked`). Include both.

`GET /api/contracts/:id`

Returns the contract, its shares, and the last 20 events. Share objects include PayPal ids, `money_source`, `sample_label`, status, name, `is_grace_subject`, and `amount_cents`. They omit idempotency keys.

## Create from a rule

`POST /api/contracts`

```json
{ "rule_text": "string, 1 to 2000 chars" }
```

Server creates the contract in `extracting`, calls the model once, validates `ai.md`, and stores `extraction_json`.

If `missing` is non-empty or the totals disagree, status becomes `needs_clarification` and the response is 422:

```json
{
  "error": "needs_clarification",
  "message": "Which deadline should Foldback use?",
  "contract_id": "con_...",
  "missing": ["deadline_at"],
  "extraction": {}
}
```

The `message` is the model's `clarification_question` when present, otherwise the fixed sentence in `ai.md`.

If the extraction is complete and consistent, status becomes `awaiting_confirmation` and the response is 200 with `{ "contract_id", "extraction" }`. No shares exist yet.

A second paste is a new contract. Do not overwrite a confirmed contract.

## Confirm

`POST /api/contracts/:id/confirm`

Allowed only from `awaiting_confirmation`.

```json
{
  "title": "Cabin weekend",
  "currency": "USD",
  "total_cents": 32000,
  "share_cents": 8000,
  "headcount": 4,
  "deadline_at": "2026-11-06T18:00:00-08:00",
  "timezone": "America/Los_Angeles",
  "grace_person_name": "Maya Shah",
  "grace_until": "2026-11-09T18:00:00-08:00",
  "people": ["Alex Chen", "Sam Ortiz", "Jordan Lee", "Maya Shah"]
}
```

`people` length must equal `headcount`. Names are unique, 1 to 80 characters. Exactly one name equals `grace_person_name` when grace is set. When the extraction had no grace, both grace fields are null and omitted.

The server checks every scalar against `extraction_json`. Any difference returns `422 confirm_mismatch`. The human fixes the paste and creates a new contract. The confirm screen does not silently edit money fields.

On success the server inserts shares in `waiting`, `money_source = sandbox`, `amount_cents = share_cents`, sets `demo_now` to two hours before `deadline_at`, sets status `active`, sets `confirmed_at`, and writes `rule_confirmed`.

Response is the same shape as `GET /api/contracts/:id`.

## Clock

`POST /api/contracts/:id/clock`

```json
{ "demo_now": "2026-11-06T18:30:00-08:00" }
```

Stores `demo_now`, writes `clock_moved`, and runs resolve. Response is the contract read model. Rejected when status is `locked`, `unwound`, or `blocked` (`409 contract_terminal` for the last two, `409 contract_locked` for lock). Moving the clock backward is allowed only while status is `active` and no share is `captured` or beyond. If any sandbox capture exists, backward moves return `409 bad_clock` with message "The demo clock cannot move backward after a payment."

Add `409 bad_clock` to the client handler.

## Resolve

`POST /api/contracts/:id/resolve`

No body. Runs the same function as the clock route without changing `demo_now`. Used by the Resolve button and by tests.

## Checkout

`POST /api/contracts/:id/shares/:shareId/checkout`

No body. Conditions in `architecture.md` and `paypal.md`. On success:

```json
{
  "order_id": "PAYPALORDERID",
  "approve_url": "https://www.sandbox.paypal.com/checkoutnow?token=PAYPALORDERID"
}
```

Share status becomes `checkout_open`.

## Capture

`POST /api/contracts/:id/shares/:shareId/capture`

```json
{ "order_id": "PAYPALORDERID" }
```

The `order_id` must match the stored order. The server captures using the stored idempotency key. Response:

```json
{
  "outcome": "completed",
  "status": "captured",
  "capture_id": "CAPTUREID"
}
```

or

```json
{
  "outcome": "unknown",
  "status": "capture_unknown",
  "capture_id": null
}
```

A completed capture then runs resolve, so a fourth capture before the deadline can return with the contract already `locked` and this share `locked`.

## Sync

`POST /api/contracts/:id/shares/:shareId/sync`

Optional body `{ "buyer_cancelled": true }`. Omit the body on the Blocked banner's Check payment action.

Re-reads PayPal for the stored ids. Returns the share. This is the only route that may move `capture_unknown` to `captured` or `waiting`, and `refund_unknown` to `refunded` or back to a state where the stored refund did not happen. If the refund did not happen, set the share to `captured` and the contract to `unwinding`, and let the operator press Resolve to send the refund once. Do not send it inside a blind retry loop.

When `buyer_cancelled` is true and the order is not captured, set the share to `declined`. Details are in `paypal.md`.

## Refund route

There is no public "refund this one person" route. Refunds happen inside resolve, for every captured share, when the rule fails. Tests call resolve. A direct refund helper may exist in `paypal/ops.ts` and is not mounted as its own POST.

## Scheduler projection

`GET /api/contracts/:id/scheduler`

```json
{
  "timezone": "America/Los_Angeles",
  "start": "2026-11-06T08:00:00-08:00",
  "end": "2026-11-11T20:00:00-08:00",
  "deadline_at": "2026-11-06T18:00:00-08:00",
  "grace_until": "2026-11-09T18:00:00-08:00",
  "demo_now": "2026-11-06T16:00:00-08:00",
  "resources": [{ "id": "shr_...", "name": "Alex Chen" }],
  "events": [
    {
      "id": "shr_...:held",
      "resourceId": "shr_...",
      "name": "Held",
      "status": "captured",
      "startDate": "2026-11-06T16:00:00-08:00",
      "endDate": "2026-11-06T18:00:00-08:00",
      "moneySource": "sample"
    }
  ]
}
```

Event names and time spans are specified in `scheduler.md`. The client passes this JSON to Bryntum without recomputing status.

## CORS and cookies

No cookies. No auth header in the MVP. The PayPal return lands on `/checkout/:contractId/:shareId?token=ORDERID&PayerID=...`. The Checkout screen reads `token` and posts it as `order_id` to the capture route.
