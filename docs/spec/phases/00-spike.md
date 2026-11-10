# Phase 0 — Spike

Budget: 6 hours. Hats: PayPal and UI. Dates: 28–29 October 2026.

## Read

`README.md`, `product.md`, `paypal.md` (environment, create order, authorize, capture, void), `ai.md` (provider), `scheduler.md` (package, license gate), and `plan.md` (stop rules).

## Goal

Prove the risky integrations against real services before designing anything on top of them:

1. The Bryntum Scheduler trial renders inside **Next.js 16 / React 19.2** as a client-only component.
2. Sandbox **authorize → capture** and **authorize → void** return real ids.
3. **Groq `openai/gpt-oss-120b`** returns strict JSON-schema output and completes one tool call, and a free **OpenRouter** model is identified as backup.

## Do not

- Design screens or the schema.
- Commit secrets, `.env`, or Bryntum source.
- Draw a CSS calendar if Bryntum fails. Stop instead.
- Claim a capture or void you only simulated.

## Create

Throwaway spike folders. Phases 1, 3, and 5 replace them with the real packages.

```text
.gitignore  .gitattributes                         (already present)
spike/bryntum-next/                               create-next-app (TS, App Router), Yarn
  src/app/spike/page.tsx                          dynamic(() => import("./Board"), { ssr: false })
  src/app/spike/Board.tsx                         one resource "Alex Chen", one event "Held" 16:00–18:00 on 6 Nov 2026 (America/Los_Angeles), read-only
spike/api/                                        Yarn package, TypeScript, tsx
  paypal-spike.ts
  llm-spike.ts
  .env.example
```

Put the exact working Bryntum install command in a comment at the top of `Board.tsx`.

## PayPal spike

Run 1, the keep path:

1. Refuse to run unless `PAYPAL_ENV=sandbox`.
2. Create an `AUTHORIZE` order for `80.00` USD with the `payment_source.paypal.experience_context` body from `paypal.md`. Set `return_url` to `http://localhost:3000/spike-return`. Print the `payer-action` link.
3. Approve with the sandbox personal account, then paste the returned `token`.
4. Authorize. Print the authorization id, status, and `expiration_time`.
5. Capture with `final_capture: true`. Print the capture id and status.

Run 2, the release path:

1. Repeat steps 2–4 with a new order.
2. Void. Print the HTTP status (expect 204).
3. GET the authorization and print its `status` (expect `VOIDED`).

Print `paypal-debug-id` for every request. Never print the access token.

## LLM spike

Create a free Groq account and key at console.groq.com (no card). An OpenRouter key is optional for this phase (openrouter.ai, also free). Put both in `spike/api/.env`.

Run `yarn spike:llm`, which:

1. Lists Groq's models (`GET /openai/v1/models`) and prints the ones named `gpt-oss`, `qwen`, `llama`, or `muse`.
2. Sends the cabin chat from `demo.md` to `openai/gpt-oss-120b` with a strict JSON schema, validates the reply with zod, and prints the result, `finish_reason`, usage, elapsed time, and the `x-ratelimit-*` headers.
3. Runs a one-tool round trip (`lookup_person`) with `tool_choice: "auto"`, and prints the final answer.
4. Lists OpenRouter models (no key needed) that are free and support `tools` and `structured_outputs`, sorted by context size, and calls the first one if a key is set.

## License email

Send the email below to Bryntum, or post the same text in the PayPal Discord's Bryntum channel. Record the date and the answer in `plan.md`.

```text
Subject: Foldback: Bryntum trial through 15 December 2026

Hello,

We are building Foldback, a group-payment demo on PayPal. Bryntum Scheduler is the live board where each friend's PayPal hold moves from waiting, to held, to kept or released.

Judging runs until 15 December 2026, and our 45-day trial started on 28 October ends a few days before that. Could you confirm that our team, and judges opening our hosted demo or installing @bryntum/scheduler-trial from npm, may use Scheduler for this project through 15 December 2026?

We will not commit Bryntum source or license keys. Our own code is MIT licensed.

Thank you!
```

Also on day one: line up the cloud accounts (see `deploy.md` → Accounts and ownership).

## Exit check

- [x] `yarn dev` in `spike/bryntum-next` shows the Held row at `/spike` with no hydration errors.
- [x] `yarn build` output records the Bryntum chunk's compressed size, and DevTools Network shows the transferred and resources numbers for `/spike`. These set the board budget in `quality.md` §4.
- [x] PayPal: authorization id, capture `COMPLETED`, second authorization id, void 204, GET `VOIDED`.
- [x] LLM: Groq strict-schema reply, tool-call round trip, the Groq and OpenRouter free-model lists, and the rate-limit headers recorded.
- [x] Optional: Bryntum license question posted in the PayPal Discord (not blocking).
- [x] Hosting decided: Oracle had no capacity, so production moved to Azure (see `deploy.md`).

## Exit note

Authorization (keep path): `9V683724UA9772037`, status CREATED, expires 2026-11-26 (29 days). US business sandbox account, US personal buyer.

Capture id: `4SK71757WJ327603A`, status COMPLETED.

Authorization (release path), void status: `884176326X892633S`. Void returned HTTP 200 (not 204, because we send `Prefer: return=representation`), and GET shows `VOIDED`.

LLM (28 Oct 2026): Gemini `gemini-3.6-flash`, `gemini-3.5-flash-lite`, and `gemini-3.1-flash-lite` passed ping, strict schema, and a tool round trip (1.5 to 3.8 s). `gemini-3.8-flash` and `gemini-3.7-flash` returned HTTP 503 "high demand" (the earlier 45 s timeout was this overload, not our request shape). `gemini-3.5-flash` hit the 5 requests/min quota mid-test. Groq `openai/gpt-oss-120b` passed (1.3 to 2.3 s, title "Cabin weekend"). Limits: Gemini Flash 5/min, Flash-Lite 15/min, 250K tokens/min (daily limit not seen), Groq 30/min, 1,000/day, 8,000 tokens/min. Gemini Pro models have 0 free quota, `gemini-2.5-flash` returns 404 for new users, and Gemini sends no rate-limit headers.

Bryntum (28 Oct 2026): install command `yarn add "@bryntum/scheduler@npm:@bryntum/scheduler-trial@^7.3.7" @bryntum/scheduler-react@^7.3.7` (Yarn needs the explicit range). Next 16.4.3 with React 19.3 and Turbopack: the dev server dies while compiling `/spike`, on the laptop (froze it) and in Codespaces. `next dev --webpack` works and the page opens. The trial's install script stays disabled and nothing breaks. `next build --webpack` passes. Largest chunk: 1,390,124 bytes gzip (3,465,527 raw) is Bryntum, plus 57,189 bytes gzip of CSS. The next largest JS chunks are 68 KB (React framework) and 67 KB. The `/spike` page rendered the orange Held bar for Alex Chen.

License email: optional insurance only. Every team uses the same trial link and the same 45-day clock, so we continue without waiting for a reply.

Hosting status (29 Oct 2026): Oracle Always Free had no capacity. Production runs on Azure: the database in the project lead's student account, the VM in a teammate's account, and a third account kept as the scale-out spare.
