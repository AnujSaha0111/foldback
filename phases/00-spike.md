# Phase 0 — Spike

Budget: 6 hours. Owners: PayPal and UI.

## Read

- `README.md`
- `product.md`
- `paypal.md` through the capture and refund sections
- `scheduler.md` license gate and package name
- `plan.md` stop rules

Do not read ahead to implement phase 1 schema. This phase may use a throwaway script and a hardcoded scheduler row.

## Goal

Prove the trial Scheduler renders, and prove sandbox capture and refund with real ids.

## Do not

- Do not design extra screens.
- Do not call the model.
- Do not store the PayPal secret in git.
- Do not draw a CSS calendar if Bryntum fails. Stop.
- Do not claim a refund you only simulated in a comment.

## Create

```text
app/package.json
app/tsconfig.json
app/.gitignore          node_modules, .env, data, dist
app/.env.example        keys from paypal.md, empty values
app/client/index.html
app/client/src/main.tsx
app/client/src/spike/SpikeBoard.tsx
app/server/src/index.ts
app/server/src/spike/paypal-spike.ts
```

`app/package.json` scripts:

- `dev` runs the API and Vite
- `spike` runs `paypal-spike.ts` with `tsx` and dotenv

Dependencies to install, and no others: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`, `express`, `dotenv`, `tsx`, `@bryntum/scheduler` aliased to `@bryntum/scheduler-trial`, and the matching `@bryntum/scheduler-react` trial if the React guide requires it. Use the React guide's package names if they differ, and write the exact install command into a comment at the top of `SpikeBoard.tsx`.

Vite proxies `/api` to port 8787. `GET /api/health` returns the body from `api.md`.

## Scheduler spike

`SpikeBoard` renders one resource, `Alex Chen`, and one event named `Held` from 16:00 to 18:00 on 6 November 2026 in `America/Los_Angeles`. Follow `scheduler.md`: read-only, event name visible as text. This component is throwaway. Phase 3 replaces it with `FoldbackScheduler`. It is acceptable for phase 0 to hardcode the event.

## PayPal spike

`paypal-spike.ts`:

1. Refuse to run unless `PAYPAL_ENV` is `sandbox`.
2. Create an order for `80.00` USD with `custom_id` `spike` and a fresh `invoice_id` `foldback-spike-{timestamp}`.
3. Print the approve URL and wait for the operator to paste the order id from the return URL.
4. Capture with header `PayPal-Request-Id: spike-capture-{timestamp}`.
5. Print the capture id.
6. Refund the full `80.00` with header `PayPal-Request-Id: spike-refund-{timestamp}` and `note_to_payer` from `paypal.md`.
7. Print the refund id and refund status.

The human approves in the sandbox personal account. One successful pair of ids is the proof. Paste them into the exit note at the bottom of this file when done. Do not paste the access token.

## License email

Send this, then record the result in `plan.md`:

```text
Subject: PayPal hackathon trial through 15 December 2026

Hello,

We are building Foldback for the PayPal AI hackathon (paypalaihackathon.devpost.com). The app uses Bryntum Scheduler as the board where group payments move from held, to kept, or to refunded.

Judging runs through 15 December 2026. A 45-day trial started in late October ends before that. Please confirm whether our team and a judge installing @bryntum/scheduler-trial from npm may use Scheduler to run and judge this project through 15 December 2026.

We will not commit package source or license keys. Our own code will be MIT.

Thank you
```

## Exit check

- `npm run dev` shows the Held row.
- The spike script printed a capture id and a refund id whose status is `COMPLETED`.
- `.env` is gitignored. `.env.example` has empty secrets.
- The license email is sent, or the phase note says the contact form was submitted and the reply is pending.
- If capture or refund failed inside this budget, stop the whole build and write the error under this heading instead of starting phase 1.

## Exit note

Capture id:

Refund id:

License email:
