# PayPal

Sandbox only. Base URL `https://api-m.sandbox.paypal.com`. `PAYPAL_ENV` must be `sandbox`; the server refuses to boot otherwise.

Flow: create an order with `intent: AUTHORIZE` → buyer approves in PayPal → server authorizes the order (funds held, not charged) → later, the server either **captures** the authorization (kept) or **voids** it (released).

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `PAYPAL_CLIENT_ID` | for checkout | Sandbox REST app. Boot accepts it unset, so a deploy never takes the app down. Without it no PayPal call is made and checkout stays closed |
| `PAYPAL_CLIENT_SECRET` | for checkout | Server only. Same as above |
| `PAYPAL_ENV` | yes | Literal `sandbox` |
| `PAYPAL_API_BASE` | no | Default and only accepted value: `https://api-m.sandbox.paypal.com` |
| `APP_BASE_URL` | yes | `http://localhost:3000` in dev, `https://{domain}` in prod. Return URLs are built from it |
| `GEMINI_API_KEY` | phase 4+ | Free key from aistudio.google.com/apikey. Do not enable billing on its Google Cloud project |
| `GROQ_API_KEY` | phase 4+ | Free Groq key (console.groq.com/keys). No card. Use a key dedicated to this project |
| `OPENROUTER_API_KEY` | no | Free OpenRouter key for the backup provider |
| `LLM_CHAIN` | no | Ordered `provider:model` list, default `deepseek:deepseek-flash,groq:openai/gpt-oss-120b,gemini:gemini-3.1-flash-lite,gemini:gemini-3.5-flash-lite`. An `openrouter:` entry must be `openrouter/free` or end in `:free`, otherwise boot fails. Entries whose key is unset are skipped |
| `AI_ENABLED` | no | Default `true`. Kill switch for every AI route |
| `AI_DAILY_CALLS` | no | Default `600` |
| `AI_USER_PER_MIN` / `AI_USER_PER_DAY` | no | Default `6` / `30` |
| `AI_IP_PER_MIN` / `AI_IP_PER_DAY` | no | Default `10` / `60` |
| `AGENT_PER_CONTRACT_PER_DAY` | no | Default `25` |
| `PAYPAL_WRITES_ENABLED` | no | Default `true`. Kill switch for checkout and authorize |
| `IP_HASH_SALT` | optional | Random string (16+ characters) used to hash IPs in `ai_usage`. When unset, the hash is keyed from `JWT_SECRET`, so production needs no extra secret |
| `PORT` | no | Default `8787` |
| `DATABASE_URL` | yes | `postgres://…`. Dev uses the Compose Postgres on 5432; tests use `TEST_DATABASE_URL` on 5433 |
| `PAYPAL_TIMEOUT_MS` | no | Default `15000`. Abort a PayPal call after this and treat it as unknown |

Server, auth, and observability variables (`NODE_ENV`, `JWT_SECRET`, `CORS_ORIGINS`, `TRUST_PROXY`, `LOG_LEVEL`, `METRICS_TOKEN`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `SIGNUPS_ENABLED`) are listed in `deploy.md`. `backend/.env.example` and `deploy/env.production.example` list every key with empty secrets. All are parsed by the zod env module, so a missing or invalid value stops boot with a clear message. `.env` files are gitignored.

In the PayPal developer dashboard, use the default sandbox accounts or create two: a **business** account (merchant; the REST app belongs to it) and a **personal** account (buyer). The buyer logs in inside the PayPal window. The README gives judges the personal sandbox login, which is test-only data.

## OAuth

`POST /v1/oauth2/token`, basic auth `client_id:secret`, body `grant_type=client_credentials`. Cache the token until 60 seconds before `expires_in`. Never log it.

## Common request rules

- Every mutating call sends `PayPal-Request-Id` (idempotency key), `Content-Type: application/json`, `Authorization: Bearer {token}`, and `Prefer: return=representation`.
- Every call has an abort timeout of `PAYPAL_TIMEOUT_MS`.
- Store the `paypal-debug-id` response header on the operation row. It is what PayPal support asks for.
- Classify each response as one of:
  - **completed**: the documented success status.
  - **definite failure**: HTTP 4xx with a parseable JSON body. Record `name` and `details[0].issue`. A call that never left because no token could be had is also a definite failure: nothing reached PayPal.
  - **unknown**: abort, network error, HTTP 5xx, an unparseable body, a 2xx body missing what this file promises, or `RESOURCE_CONFLICT` (issue `PREVIOUS_REQUEST_IN_PROGRESS`), which means an earlier request with this key is still running.
- A stored response drops `payer`, `payment_source`, and `purchase_units[].shipping`, all of which carry the buyer's details.

## Idempotency keys

Derived from the object being acted on, so a retry of the same action always reuses the same key:

| Call | Key |
|---|---|
| Create order | `fb-order-{shareId}-{checkout_attempt}` |
| Authorize order | `fb-auth-{orderId}` |
| Capture authorization | `fb-capture-{authorizationId}` |
| Void authorization | `fb-void-{authorizationId}` |

A declined checkout increments `checkout_attempt`, so the next order gets a fresh key. The original spec used one key per share for life. That would have made PayPal replay the cancelled order.

## Create order

`POST /v2/checkout/orders`

```json
{
  "intent": "AUTHORIZE",
  "purchase_units": [
    {
      "reference_id": "{shareId}",
      "custom_id": "{shareId}",
      "invoice_id": "foldback-{shareId}-{checkout_attempt}",
      "description": "Foldback hold: {contract.title} share for {display_name}",
      "amount": { "currency_code": "USD", "value": "80.00" }
    }
  ],
  "payment_source": {
    "paypal": {
      "experience_context": {
        "brand_name": "Foldback",
        "shipping_preference": "NO_SHIPPING",
        "user_action": "PAY_NOW",
        "return_url": "{APP_BASE_URL}/pay/{shareId}",
        "cancel_url": "{APP_BASE_URL}/pay/{shareId}?cancelled=1"
      }
    }
  }
}
```

- `value` is `amount_cents` formatted with two decimals, inside `integrations/paypal/client.ts` only.
- `description` is cut to PayPal's limit of 127 characters.
- `approve_url` must start with `https://www.sandbox.paypal.com/`. Any other link is unknown, because the `shares` CHECK would refuse it.
- `application_context` is deprecated. Use `payment_source.paypal.experience_context` as shown.
- Success: HTTP 200/201 with `status` `PAYER_ACTION_REQUIRED` (or `CREATED`). Store `id` as `order_id`. The approval link is the `links[]` entry whose `rel` is `payer-action` (with `payment_source`) or `approve` (older shape). Accept either.
- Lost response before an order id is parsed: operation `unknown`, share `checkout_open` with a null `order_id`. Sync with a null `order_id` marks the operation `failed` and returns the share to `waiting`, without calling PayPal. This is the one sync path that makes no PayPal call. Because the key is per attempt, the new attempt cannot collide.
- Definite 4xx: operation `failed`, share back to `waiting`, `502 paypal_failed`.

## Buyer approval

The browser does a full-page navigation to `approve_url`. Foldback never collects card data. After approval, PayPal redirects to `return_url?token={orderId}&PayerID=…`. The Pay screen posts `token` as `order_id` to the authorize route.

On cancel, PayPal redirects to `cancel_url`. The Pay screen calls sync with `{ "buyer_cancelled": true }`. If GET order shows the order was not approved (`CREATED` or `PAYER_ACTION_REQUIRED`), the share becomes `declined` and nothing is held.

## Authorize order

`POST /v2/checkout/orders/{order_id}/authorize`, body `{}`, key `fb-auth-{orderId}`. The share is set to `authorize_unknown` in the transaction before the call, so a crash during it reads as unknown money. Each result below then moves it on.

- Success: HTTP 201, order `status` `COMPLETED`, and `purchase_units[0].payments.authorizations[0]` with `status` `CREATED`. Store `authorization_id` = that `id` and `authorization_expires_at` = `expiration_time`. Share `held`, event `hold_placed`.
- An authorization `status` of `DENIED` (or `PENDING`, for review) counts as a definite failure. `PENDING` is not a hold we can rely on. This order can never succeed, because a retry would replay the same answer, so the share becomes `declined`, event `checkout_declined`, `502 paypal_failed` with "PayPal did not approve this hold." The next checkout starts a new order. Foldback stores no id for the refused authorization, so it can never capture it.
- Definite 4xx with issue `ORDER_ALREADY_AUTHORIZED`: GET the order, read the existing authorization, store it as `held`. That is a replay, not a second hold.
- Definite 4xx with issue `ORDER_NOT_APPROVED`: share stays `checkout_open` so the buyer can go back to PayPal from the pay page.
- Unknown: share `authorize_unknown`, operation `unknown`, return 200 `outcome: unknown`.

## Capture authorization

`POST /v2/payments/authorizations/{authorization_id}/capture`, key `fb-capture-{authorizationId}`

```json
{
  "amount": { "currency_code": "USD", "value": "80.00" },
  "final_capture": true,
  "invoice_id": "foldback-capture-{shareId}",
  "note_to_payer": "Everyone paid by the deadline, so Foldback captured your share."
}
```

- Success: HTTP 201 with capture `status` `COMPLETED` (sandbox may return `PENDING`; treat `PENDING` as completed for our state, store the id, and note it in the event). Store `id` as `capture_id`. Share `kept`.
- Definite 4xx: GET the order. If `purchase_units[0].payments.captures[]` has a capture tied to this authorization, store it (replay). Otherwise share `capture_failed`, contract `blocked`, `resolution_reason` names the person, and the PayPal issue is stored on the operation row.
- Unknown: share `capture_unknown`, stop the wave, contract `blocked`.

## Void authorization

`POST /v2/payments/authorizations/{authorization_id}/void`, empty body, key `fb-void-{authorizationId}`.

- Success: HTTP 204 (no body), or 200 with the authorization showing `status` `VOIDED`. Share `released`, event `hold_released`.
- Definite 4xx: GET the authorization. `VOIDED` or `EXPIRED` → `released` (replay; the hold is gone either way). Otherwise the share stays `held`, contract `blocked`, and the reason says PayPal refused the release.
- Unknown: share `void_unknown`, stop the wave, contract `blocked`.

## Reads used by sync

- `GET /v2/checkout/orders/{order_id}`
- `GET /v2/payments/authorizations/{authorization_id}`

| Local status | PayPal fact | Result |
|---|---|---|
| `checkout_open`, `order_id` null, create older than three timeouts | none (no call) | operation `failed`, share `waiting` |
| `checkout_open` + `buyer_cancelled` | order `CREATED` / `PAYER_ACTION_REQUIRED`, or 404 `RESOURCE_NOT_FOUND` | share `declined` |
| `held` or later + `buyer_cancelled` | none (no call) | unchanged |
| `authorize_unknown` | authorization `CREATED` with an expiry | share `held`, store ids |
| `authorize_unknown` | authorization `DENIED`, `PENDING`, `VOIDED` or `EXPIRED` | share `declined` |
| `authorize_unknown` | order `APPROVED`, no authorization | share `checkout_open` (pay page shows "Finish holding my share") |
| `authorize_unknown` | order `CREATED` / `PAYER_ACTION_REQUIRED` / `VOIDED` | share `checkout_open` / `checkout_open` / `declined` |
| `capture_unknown` | authorization `CAPTURED` (or `PARTIALLY_CAPTURED`) | GET order, store `capture_id`, share `kept` |
| `capture_unknown` | authorization `CREATED` | share `held`. Direction stays `keep`; the next resolve captures once with the same key |
| `capture_unknown` | authorization `VOIDED`, `EXPIRED`, `DENIED` or `PENDING` | share `held` again, so the plan can end: the next capture, with the same key, is refused and the share ends `capture_failed`. Nothing was captured |
| `void_unknown` | authorization `VOIDED` or `EXPIRED` | share `released` |
| `void_unknown` | authorization `CREATED` | share `held`. Direction stays `release`; the next resolve voids once with the same key |
| any | GET fails or is unknown | stay unknown |

After sync clears the last unknown, the contract stays `blocked` until the organizer presses Resolve (the Paused banner's Check payment button does both in sequence). Sync writes `contract_unblocked` when the last unknown clears.

## Authorization lifetime

PayPal authorizations are valid for 29 days, with the best capture success during the first 3 days (the honor period). Sandbox authorizations do not expire after 29 days. Foldback stores `authorization_expires_at` and shows it in the detail panel. Reauthorization is out of scope. The README states the limit: "Designed for plans that resolve within days. Holds over 3 days old may fail to capture in production."

## What is labeled demo data

| Row | Badge | PayPal call allowed |
|---|---|---|
| Seed, `money_source = sample` | `Sample — no PayPal hold` | No |
| Confirmed share, no hold yet | `Sandbox` | Checkout and authorize |
| Share with an authorization id from our server | `Sandbox` + authorization id | Capture or void, through resolve only |
| Anything typed into the UI as an id | not a status | Never accepted |

## Negative tests the adapter must support

Jest with a mocked `fetch` (see `test.md`), plus one manual sandbox pass per phase:

- A repeated authorize for the same order sends the same `PayPal-Request-Id`, and an `ORDER_ALREADY_AUTHORIZED` response stores the existing authorization.
- A timeout on authorize leaves `authorize_unknown`, and a second checkout returns `409 money_unknown`.
- A timeout on capture leaves `capture_unknown`, and resolve returns `409 money_unknown` with zero further PayPal calls.
- A timeout on void leaves `void_unknown`, and the next resolve sends no void until sync.
- `PAYPAL_ENV=live` throws on boot.

Never point the app at `https://api-m.paypal.com`.

## Official references

- Orders v2 create and authorize: `https://developer.paypal.com/api/orders/v2/`
- Authorize and capture later: `https://developer.paypal.com/checkout/delay-capture`
- Payments v2 authorizations (capture, void, get): `https://developer.paypal.com/api/payments/v2/`
- Idempotency: `https://developer.paypal.com/api/rest/reference/idempotency/`

When an example in those docs offers extra fields, follow this file. Do not send items, shipping, or payee overrides.
