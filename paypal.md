# PayPal

Sandbox only. Base URL `https://api-m.sandbox.paypal.com`. Environment variable `PAYPAL_ENV` must be `sandbox`. The server refuses to boot if it is any other value.

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `PAYPAL_CLIENT_ID` | yes | Sandbox REST app |
| `PAYPAL_CLIENT_SECRET` | yes | Server only |
| `PAYPAL_ENV` | yes | Literal `sandbox` |
| `PAYPAL_API_BASE` | yes | `https://api-m.sandbox.paypal.com` |
| `APP_BASE_URL` | yes | `http://127.0.0.1:5173` in dev |
| `LLM_API_KEY` | phase 2+ | Model |
| `LLM_BASE_URL` | phase 2+ | OpenAI-compatible origin, no trailing path |
| `LLM_MODEL` | phase 2+ | Model name that supports JSON schema |
| `PORT` | no | API port, default `8787` |
| `DATABASE_PATH` | no | Default `app/data/foldback.sqlite` |

Copy `app/.env.example` in phase 0 with these keys and empty secrets. Gitignore `.env`.

Create two sandbox accounts in the PayPal developer dashboard: one business (merchant) and one personal (buyer). The REST app credentials belong to the business account. The video buyer logs into the personal sandbox account in the PayPal window.

## OAuth

`POST /v1/oauth2/token` with basic auth `client_id:secret` and body `grant_type=client_credentials`. Cache the token until 60 seconds before `expires_in`. Do not send the client secret on any other route.

## Create order

`POST /v2/checkout/orders`

Header `PayPal-Request-Id: {share.order_idempotency_key}`  
Header `Content-Type: application/json`  
Header `Authorization: Bearer {token}`

```json
{
  "intent": "CAPTURE",
  "purchase_units": [
    {
      "custom_id": "{shareId}",
      "invoice_id": "foldback-{shareId}",
      "description": "Foldback share for {contract.title}",
      "amount": {
        "currency_code": "USD",
        "value": "80.00"
      }
    }
  ],
  "application_context": {
    "brand_name": "Foldback",
    "shipping_preference": "NO_SHIPPING",
    "user_action": "PAY_NOW",
    "return_url": "{APP_BASE_URL}/checkout/{contractId}/{shareId}",
    "cancel_url": "{APP_BASE_URL}/checkout/{contractId}/{shareId}?cancelled=1"
  }
}
```

`value` is `amount_cents` formatted with two decimals. `invoice_id` must be unique per share and stable across retries of the same order so PayPal's idempotency has a matching body.

Read the approval link from `links[]` where `rel` is `approve`. Store `order_id` from the response `id`.

If this call times out, leave the share in `waiting` only when no operation row was left `unknown`. If the operation was inserted and the response is lost, mark `capture_unknown` is wrong because we may not have an order id. Mark the operation `unknown`, set share status to `checkout_open` only if an order id was parsed. If no order id was parsed, set share back to `waiting` and operation `failed` when the HTTP status is a definite 4xx. When there is no HTTP status, set operation `unknown` and share `checkout_open` with a null `order_id`, and block another checkout until sync. Sync with a null order id marks the operation failed and returns the share to `waiting`. That is the one sync path that does not call PayPal.

## Buyer approval

The browser navigates to `approve_url`. Foldback does not collect a card. After approval PayPal redirects to `return_url` with `token` (the order id) and `PayerID`. The Checkout screen then posts that token to the capture route.

Cancel redirects to `cancel_url` with `cancelled=1`. The Checkout screen calls sync with body `{ "buyer_cancelled": true }`. That is the only sync body field. If the order is still `CREATED` or `PAYER_ACTION_REQUIRED`, set the share to `declined` and do not capture.

## Capture

`POST /v2/checkout/orders/{order_id}/capture`

Header `PayPal-Request-Id: {share.capture_idempotency_key}`  
Header `Content-Type: application/json`  
Empty JSON object body.

Success is HTTP 201 and `status` `COMPLETED`, with a capture id at `purchase_units[0].payments.captures[0].id` whose capture `status` is `COMPLETED`. Store that id. Anything else with a readable 4xx is `paypal_failed` and the share stays `checkout_open` so the buyer can retry only when the order is still capturable. If PayPal says the order is already captured, `GET` the order and store the existing capture id instead of treating it as a new capture. That is a replay, not a second charge.

`PayPal-Request-Id` replay: if PayPal returns the previous completed capture for the same key, store that same capture id and return `outcome: completed`. Do not create another order.

Timeout or non-JSON response: share `capture_unknown`, operation `unknown`, return 200 `outcome: unknown`.

## Get order and get refund

`GET /v2/checkout/orders/{order_id}` for sync of capture.

`GET /v2/payments/captures/{capture_id}` to see if a refund is already attached.

`GET /v2/payments/refunds/{refund_id}` when we stored a refund id.

Sync mapping:

| PayPal fact | Local result |
|---|---|
| Order `COMPLETED` and a `COMPLETED` capture exists | share `captured`, store capture id. Phase 4 leaves the contract `active`. From phase 6 onward, call resolve so a full headcount can lock |
| Order `VOIDED` or buyer cancelled | share `declined` if not captured |
| Capture `COMPLETED` and refund `COMPLETED` | share `refunded`, store refund id |
| Capture `COMPLETED` and no refund, local status was `refund_unknown` | share `captured`, contract stays `unwinding` or returns to `unwinding` |
| GET fails | stay unknown |

## Refund

`POST /v2/payments/captures/{capture_id}/refund`

Header `PayPal-Request-Id: {share.refund_idempotency_key}`  
Header `Content-Type: application/json`  
Header `Prefer: return=representation`

```json
{
  "amount": { "currency_code": "USD", "value": "80.00" },
  "invoice_id": "foldback-refund-{shareId}",
  "note_to_payer": "Foldback returned this share because the confirmed headcount was not met."
}
```

The amount is the full share. Partial refunds are out of scope.

Success is refund `status` `COMPLETED`. Store `refund.id`.

If the body says the capture was already fully refunded, `GET` the capture, find the existing refund id, store it, and mark `refunded`. That is a replay.

Timeout: `refund_unknown`, stop the unwind loop, contract `blocked`.

Definite 4xx that is not "already refunded": operation `failed`, share returns to `captured`, contract `blocked`, `resolution_reason` explains that the refund was refused by PayPal and no retry was sent.

## What is labeled demo data

| Row | Badge | PayPal call allowed |
|---|---|---|
| Phase 1 seed, `money_source = sample` | `Sample` | No |
| Share created by confirm, no capture yet | `Sandbox` | Yes, checkout |
| Share with a capture id returned by our server | `Sandbox` plus the capture id | Refund through resolve only |
| Anything typed into the UI as an id | Not a status | Never accepted |

The video may show sample rows only in a cut that is labeled, or hide them. The live capture and the live refunds use `sandbox` rows. `demo.md` is the prep procedure that creates those real captures off camera.

## Negative tests the adapter must support

Phase 4 and 5 implement these with Vitest by mocking `fetch`, plus one manual sandbox pass:

- Same capture idempotency key returns the stored capture and does not increment a "calls" counter in the mock.
- Same refund idempotency key does not call fetch when a completed refund operation exists.
- A timeout on capture leaves `capture_unknown` and a second checkout returns `409 money_unknown`.
- A timeout on refund leaves `refund_unknown` and resolve returns `409 money_unknown` on the next press.
- `PAYPAL_ENV=live` throws on boot. Test this with a unit test that imports the env parser.

Do not point the app at `https://api-m.paypal.com`.

## Official references

- Orders v2: `https://developer.paypal.com/docs/api/orders/v2/`
- Captures and refunds: `https://developer.paypal.com/docs/api/payments/v2/`
- Idempotency: `https://developer.paypal.com/api/rest/reference/idempotency/`

The implementation follows this file when an example in those docs offers extra fields. Do not send items, shipping, or payee overrides.
