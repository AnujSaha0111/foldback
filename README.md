# Foldback

**Nobody pays unless the group makes it.**

A group wants to do something together (a trip, a gift, a bulk order), but nobody wants to pay until everyone is in, and the organizer ends up fronting the money or chasing refunds. Foldback holds each friend's share with a PayPal authorization: held, not charged. If the whole group holds by the deadline, every hold is captured. If not, every hold is voided and nobody pays. One named person can get extra time.

Live: **https://app.foldback.tech** (PayPal sandbox only: no real money moves).

## Try it in two minutes

1. Open the link and press **Try it as a guest**. You get a private workspace with two sample plans for 7 days.
2. Open **Cabin weekend**: one row per person on the board, Held and Waiting.
3. Ask the assistant "What happens if Maya Shah doesn't pay?". It runs the real rule on a copy and answers.
4. Press **Advance to deadline**, then **Advance to grace end**, and watch the plan release.

**A real sandbox hold:** on Plans, press **Use the sample cabin chat**, then **Read the plan** and **Confirm**. Open a pay link, approve with a PayPal sandbox buyer account, and the board shows the hold live.

## How PayPal is used

| Step | Call | Idempotency key |
|---|---|---|
| Friend opens checkout | `POST /v2/checkout/orders` with `intent: AUTHORIZE` | `fb-order-{share}-{attempt}` |
| Friend approves | `POST /v2/checkout/orders/{id}/authorize` | `fb-auth-{order}` |
| Everyone held | `POST /v2/payments/authorizations/{id}/capture` | `fb-capture-{authorization}` |
| Group short | `POST /v2/payments/authorizations/{id}/void` | `fb-void-{authorization}` |

## Money safety

- Every PayPal write is recorded as `pending` in Postgres before it is sent, runs outside any transaction, and is settled in a second transaction. A crash in between reads as unknown, never as free.
- A lost or unclear reply marks the share `*_unknown` and pauses the plan. Only a read of PayPal (sync) clears it; nothing is retried blindly. A rate limit or auth error is treated as "not processed" and retried with the same key.
- "Capture only when the decision is keep" is enforced in code and by two database triggers. Transition tables and guard triggers refuse any illegal status change.
- One resolve per plan at a time (a Postgres advisory lock), one in-flight call per share (a unique index).
- Tests run on a real Postgres with a scripted PayPal: 531 backend tests, 222 frontend tests.

Limit today: if PayPal refuses one capture after others succeeded, the plan pauses and releasing the rest is a manual step.

## How AI is used, and what it may not do

- **Rule reader:** turns a pasted chat into price, people, deadline and grace, quoting the line it used for each, and asks a question when something is missing. The server re-checks every field: amounts must appear in the text, names must appear in the text, times are recomputed, and nothing is active until you confirm.
- **Assistant:** read-only tools (status, activity, simulate, draft reminders) and proposals that wait for your **Approve**. It never moves money, and pasted text and tool results are treated as data, never instructions.
- Models: DeepSeek, then Groq and Gemini as fallbacks, over plain `fetch`. No retrieval or embeddings.

## Architecture

```text
app.foldback.tech (Next.js 16, Vercel) ──► api.foldback.tech (Cloudflare Tunnel)
                                              │
                                Express 5 + Socket.IO (Docker, Mac mini)
                                   │            │            │
                              Postgres 16   PayPal sandbox   LLM APIs
```

The board is a Bryntum Scheduler fed by a server-side projection, updated live over Socket.IO. Full design: [`docs/spec/`](docs/spec/README.md).

## Run it locally

Node 24 and Docker. The tests need no PayPal or AI keys.

```bash
docker compose -f deploy/compose.dev.yml up -d
cd backend && cp .env.example .env && corepack yarn install && corepack yarn migrate && corepack yarn test
corepack yarn dev            # API on http://localhost:8787
cd ../frontend && corepack yarn install && corepack yarn dev   # http://localhost:3000
```

More in [`docs/team-setup.md`](docs/team-setup.md).

## Limits and what's next

Sandbox only. Captured money goes to Foldback's sandbox merchant account, not the organizer; payouts through PayPal's multiparty products are next. Groups of 2 to 4. The deadline is a demo clock the organizer moves; a scheduled resolver, PayPal webhooks and reauthorization after 3 days are next. One backend instance today.

## Privacy and licence

What is stored and which AI providers read your text: [/privacy](https://app.foldback.tech/privacy). Code: MIT. The board uses Bryntum Scheduler under its own licence (trial), not covered by MIT.
