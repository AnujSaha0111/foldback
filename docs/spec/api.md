# HTTP API

Base path `/api`. JSON in and out. Errors use `{ "error": "<code>", "message": "<sentence>", "request_id": "<id>" }` with the status codes below. The client shows `message` and branches only on `error`.

Bodies, params, and query strings are validated with zod strict objects (unknown keys are rejected). A missing, malformed, or extra field returns `400 bad_request` with `details` (the zod issue paths).

Every money mutation re-reads the share and contract inside a Postgres transaction before calling PayPal, and capture or void runs under the contract advisory lock (`architecture.md` → Concurrency).

## Access

| Routes | Who |
|---|---|
| `/api/auth/*` | anyone (rate-limited) |
| `/api/contracts/*`, `/api/demo/reset` | signed-in organizer (member or guest), **own contracts only**. Another user's contract returns `404 not_found`, never 403, so ids cannot be probed |
| `/api/shares/:shareId` (GET), `/checkout`, `/authorize`, `/sync` | anyone holding the pay link (the share id is the capability) |
| `/api/health` | anyone |
| `/health/live`, `/health/ready` | Compose and Caddy (not under `/api`) |
| `/metrics` | internal network, or `Authorization: Bearer {METRICS_TOKEN}` |

Every non-GET request must carry an `Origin` (or `Referer`) header in `CORS_ORIGINS`. Otherwise it returns `403 bad_origin`.

## Codes

| HTTP | `error` | When |
|---|---|---|
| 400 | `bad_request` | Missing, malformed, or unknown field |
| 401 | `unauthenticated` | No valid session cookie on an organizer route |
| 401 | `invalid_credentials` | Wrong email or password (same message for both) |
| 403 | `bad_origin` | Mutation without an allowed Origin |
| 403 | `signups_disabled` | `SIGNUPS_ENABLED=false` |
| 404 | `not_found` | Unknown contract or share, or a contract owned by someone else |
| 409 | `email_taken` | Signup with an existing email. Same response time as success, to limit enumeration |
| 409 | `resolve_in_progress` | The contract lock is held by another request |
| 409 | `sample_row` | Checkout or authorize on a `sample` share |
| 409 | `share_already_held` | Checkout or authorize when the share is `held` or later |
| 409 | `share_not_payable` | Deadline passed and this share is not the open grace subject, or the share is `expired` |
| 409 | `contract_closed` | Mutation after `kept` or `released`, or after `direction` is set |
| 409 | `money_unknown` | A mutating call while this share (or, on resolve, any share) is in an unknown status |
| 409 | `capture_refused` | Resolve while a share is `capture_failed` |
| 409 | `not_confirmed` | Checkout before the contract is `active` or `grace` |
| 409 | `bad_clock` | Clock moved backward after any share was held |
| 422 | `needs_clarification` | Extraction is missing a field or the amounts disagree |
| 422 | `confirm_mismatch` | Confirm body does not match the stored extraction |
| 502 | `paypal_failed` | PayPal returned a definite 4xx business error. The share is unchanged except where `paypal.md` says otherwise |
| 413 | `payload_too_large` | JSON body over 32 KB |
| 429 | `rate_limited` | A per-IP or per-contract limit in `architecture.md` / `ai.md`. Includes `Retry-After` |
| 429 | `demo_full` | 200 non-seed contracts already exist |
| 503 | `agent_unavailable` | All LLM providers failed, or no key, on the agent route |
| 503 | `ai_budget_exhausted` | Daily AI call cap reached, or `AI_ENABLED=false` |
| 503 | `paypal_disabled` | `PAYPAL_WRITES_ENABLED=false` on checkout or authorize |
| 503 | `unavailable` | Postgres unreachable |
| 500 | `internal` | Bug, including a schema constraint refusing a write. Never turn this into a success |

A lost PayPal response is not a 502. The route returns 200 with the share in an unknown status and `outcome: "unknown"`. The money stays reserved.

## Read model

`ContractRead`, returned by most routes:

```json
{
  "contract": {
    "id": "con_…", "seed_key": null, "title": "Cabin", "status": "active",
    "direction": null, "money_source": "sandbox", "currency": "USD",
    "total_cents": 32000, "share_cents": 8000, "headcount": 4,
    "held_count": 3, "kept_count": 0, "released_count": 0,
    "deadline_at": "…", "timezone": "America/Los_Angeles",
    "grace_person_name": "Maya Shah", "grace_until": "…",
    "demo_now": "…", "resolution_reason": null,
    "clarification_question": null, "extraction": { }
  },
  "shares": [
    {
      "id": "shr_…", "display_name": "Alex Chen", "is_grace_subject": false,
      "status": "held", "amount_cents": 8000, "money_source": "sandbox",
      "sample_label": null, "order_id": "…", "authorization_id": "…",
      "authorization_expires_at": "…", "capture_id": null,
      "payable": false, "pay_path": "/pay/shr_…"
    }
  ],
  "events": [ { "type": "hold_placed", "detail": "…", "created_at": "…", "share_id": "shr_…" } ]
}
```

`events` holds the last 30, newest first. `payable` comes from `domain/payable`. Shares never expose `approve_url` or idempotency keys in this model.

## Auth

The session is the `fb_session` cookie (httpOnly, Secure, SameSite=Lax, 7 days). Its body never carries the token.

| Route | Body | Result |
|---|---|---|
| `POST /api/auth/signup` | `{ email, password (10–128), display_name (1–80) }` | 201 `{ user }`, sets the cookie, seeds the two sample plans |
| `POST /api/auth/login` | `{ email, password }` | 200 `{ user }`, sets the cookie. Wrong email or wrong password → `401 invalid_credentials` (same message, constant-time compare) |
| `POST /api/auth/guest` | `{}` | 201 `{ user }` with `kind: "guest"`, `expires_at` 7 days out, sets the cookie, seeds the two sample plans |
| `POST /api/auth/logout` | `{}` | 204, clears the cookie |
| `GET /api/auth/me` | — | 200 `{ user }` or `401 unauthenticated` |

`user` = `{ id, kind, email, display_name, expires_at }`. Never a hash.

## Health and demo

`GET /api/health` → `{ "ok": true, "service": "foldback", "version": "<git sha>", "paypal_env": "sandbox", "llm": true, "ai_calls_left": 412 }`. `llm` is false when `GROQ_API_KEY` is unset or `AI_ENABLED=false`. The client uses it to show "AI is off for today" instead of failing on click.

`GET /health/live` → 200 `{ "status": "ok" }`. `GET /health/ready` → 200 when the database answers and migrations are current, otherwise 503.

`POST /api/demo/reset` (signed in), no body. Resets only the caller's data:

```json
{
  "ok": true,
  "warning": "Your plans were reset. Sandbox holds that already exist in PayPal stay there until they are voided or expire.",
  "contracts": ["cabin-hold", "print-full"]
}
```

## Realtime (Socket.IO)

Path `/socket.io`. The handshake reads the `fb_session` cookie when present. Rooms:

| Client emits | Allowed when | Joins |
|---|---|---|
| `contract:join` `{ contractId }` | the session owns the contract | `contract:{id}` |
| `share:join` `{ shareId }` | anyone (pay link) | `share:{id}` |

Server emits, only after the transaction commits:

| Event | Payload | Client action |
|---|---|---|
| `contract:changed` | `{ contractId, version }` | invalidate the `Contract`, `Scheduler`, and `ContractList` tags if `version` is newer than the cached one |
| `share:changed` | `{ shareId, contractId }` | invalidate `PublicShare` |

Events never carry state, so the REST read model is the only source of truth. A join for a contract the user does not own gets an `error` ack and no room. Socket connections are limited to 10 per IP.

## List and read

`GET /api/contracts` → `{ "contracts": [ ContractSummary ] }`, oldest first. Summary fields: `id`, `seed_key`, `title`, `status`, `money_source`, `headcount`, `held_count`, `kept_count`, `released_count`, `share_cents`, `deadline_at`, `demo_now`, `resolution_reason`.

`GET /api/contracts/:id` → `ContractRead`.

## Create from a rule

`POST /api/contracts`

```json
{ "rule_text": "1 to 6000 chars: one sentence or a pasted group chat" }
```

Optional field `use_fixture_time: true` is honored only when `rule_text` exactly equals one of the strings in `shared/src/rules.ts`. In that case `reference_at` is that fixture's fixed reference time (`2026-11-01T12:00:00-08:00`), so the demo dates match the video. Otherwise `reference_at` is the current wall time.

The server creates the contract in `extracting`, calls the rule reader once, validates per `ai.md`, and stores `extraction_json`.

Incomplete or inconsistent → status `needs_clarification`, response 422:

```json
{
  "error": "needs_clarification",
  "message": "What time on Friday is the deadline?",
  "contract_id": "con_…",
  "missing": ["deadline_at"],
  "extraction": { }
}
```

Complete → status `awaiting_confirmation`, response 200 `{ "contract_id", "extraction" }`. No shares yet.

`LLM` missing key → 500 `internal` with message `GROQ_API_KEY is not set`. Do not silently skip extraction.

## Clarify

`POST /api/contracts/:id/clarify`, allowed only from `needs_clarification`:

```json
{ "answer": "1 to 500 chars" }
```

Appends `\n\nOrganizer: {answer}` to `rule_text`, writes `clarification_answered`, sets status `extracting`, and re-runs the rule reader on the full text. Same responses as create. At most 3 clarify rounds per contract; a fourth returns 422 with the message "Start a new rule with all the details in one message."

## Confirm

`POST /api/contracts/:id/confirm`, allowed only from `awaiting_confirmation`. The body echoes the extraction:

```json
{
  "title": "Cabin",
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

Every field must equal `extraction_json`. Any difference → `422 confirm_mismatch`, and the status stays `awaiting_confirmation`. There is no field editor.

On success: insert one share per person (`waiting`, `money_source = sandbox`, `amount_cents = share_cents`), set `demo_now` to two hours before `deadline_at`, status `active`, `confirmed_at`, event `rule_confirmed`. Response: `ContractRead`.

## Clock

`POST /api/contracts/:id/clock` with `{ "demo_now": "ISO timestamp" }`.

Stores `demo_now`, writes `clock_moved`, runs resolve, and returns `ContractRead`. When resolve returns a 409, for example `money_unknown`, the clock move still persists and the route returns that 409 with the read model under `contract_read`.

- Status `kept` or `released`: `409 contract_closed`.
- Moving backward: allowed only while no share has ever been `held` (no `hold_placed` event). Otherwise `409 bad_clock` with message "The demo clock cannot move backward after a payment was held."

## Resolve

`POST /api/contracts/:id/resolve`, no body. Runs the same function as the clock route without changing `demo_now`. Used by the Resolve button, agent proposals, and tests. Response: `ContractRead`, or the 409 codes in `architecture.md`.

## Scheduler projection

`GET /api/contracts/:id/scheduler`. Shape and spans are in `scheduler.md`. The client passes the JSON to Bryntum and does not recompute status.

## Public share (pay link)

`GET /api/shares/:shareId` returns only what the payer needs:

```json
{
  "share_id": "shr_…", "contract_id": "con_…",
  "display_name": "Maya Shah", "title": "Cabin",
  "amount_cents": 8000, "currency": "USD", "headcount": 4, "held_count": 3,
  "deadline_at": "…", "grace_until": "…", "is_grace_subject": true,
  "timezone": "America/Los_Angeles", "demo_now": "…",
  "status": "waiting", "contract_status": "active",
  "money_source": "sandbox", "payable": true,
  "other_names": ["Alex Chen", "Sam Ortiz", "Jordan Lee"]
}
```

No PayPal ids and no other people's statuses beyond `held_count`.

## Checkout

`POST /api/shares/:shareId/checkout`, no body.

- Share `checkout_open` with a stored `approve_url`: return it without calling PayPal.
- Share `waiting` or `declined` and payable: increment `checkout_attempt`, create the order (`paypal.md`), store `order_id` and `approve_url`, status `checkout_open`, event `order_created`.

```json
{ "order_id": "5O190127TN364715T", "approve_url": "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T" }
```

## Authorize

`POST /api/shares/:shareId/authorize` with `{ "order_id": "…" }` (the `token` from the return URL). It must equal the stored `order_id`, otherwise `400 bad_request`.

Response:

```json
{ "outcome": "completed", "share": { }, "contract": { } }
```

`outcome` is `completed`, `unknown`, or `failed` (with a 502 for the last). On `completed`, the route runs resolve before responding, so the fourth hold can come back with the share and contract both `kept`.

## Sync

`POST /api/shares/:shareId/sync`, optional body `{ "buyer_cancelled": true }`.

Re-reads PayPal for the stored ids and applies the mapping in `paypal.md`. This is the only route that moves a share out of an unknown status. With `buyer_cancelled: true` and an order that was never approved, the share becomes `declined`. Response: `{ "share": { }, "contract": { } }`. Sync never captures or voids. The organizer presses Resolve (or approves the agent's proposal) afterward.

## Organizer agent

`POST /api/contracts/:id/agent`

```json
{
  "messages": [
    { "role": "user", "content": "What happens if Maya doesn't pay?" }
  ]
}
```

`messages` holds plain-text turns only (`user` and `assistant`), at most 12, each at most 2000 chars, ending with a `user` turn. The client keeps the history. The server does not store conversations.

Response:

```json
{
  "reply": "If Maya doesn't pay by Monday 6:00pm PT, Foldback will release all three holds…",
  "tool_calls": [ { "name": "simulate_outcome", "summary": "Simulated Mon 9 Nov 6:00pm PT with Maya unpaid" } ],
  "proposals": [
    {
      "id": "prop_1",
      "kind": "move_clock",
      "label": "Advance to grace end (Mon 9 Nov, 6:00pm PT)",
      "demo_now": "2026-11-09T18:00:00-08:00"
    }
  ],
  "drafts": [
    { "share_id": "shr_…", "display_name": "Maya Shah", "text": "Hey Maya! …", "pay_url": "https://…/pay/shr_…" }
  ]
}
```

Proposals are not executed by this route. The client shows each one as a button that calls the existing clock or resolve route, then writes `agent_proposal_approved` through that route's `?via=agent` query flag. Details are in `ai.md`.

## PayPal return

PayPal returns the buyer to `/pay/:shareId?token=ORDERID&PayerID=…`, or `/pay/:shareId?cancelled=1`. The Pay page reads them and calls authorize or sync. Pay routes need no session.
