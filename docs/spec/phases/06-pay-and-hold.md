# Phase 6 — Pay link and hold

Budget: 7 hours. Hats: PayPal and UI. Depends on phases 4 and 5. Dates: 5–6 November 2026.

## Read

- `paypal.md`, except capture and void
- `api.md`: Public share, Checkout, Authorize, Sync
- `architecture.md`: Payable rule, Concurrency
- `ui.md`: Pay page, Person card
- `test.md`: phase 6 cases and L8

## Goal

A friend opens `/pay/[shareId]` on a phone, approves in PayPal, and returns to "Your $80.00 is held." The organizer's board flips that row to Held live, with the authorization id. A lost authorize response reserves the share until sync.

## Create

```text
backend/src/integrations/paypal/{client,keys}.ts      token cache, timeout, classification, createOrder, authorizeOrder, getOrder, getAuthorization
backend/src/domain/payable.ts
backend/src/repositories/operations.repo.ts
backend/src/services/{holds,sync}.service.ts
backend/src/routes/shares.routes.ts  backend/src/controllers/shares.controller.ts
backend/test/integration/hold.test.ts  backend/test/fixtures/paypal.ts
frontend/src/app/pay/[shareId]/page.tsx  frontend/src/features/pay/
```

Leave one clearly marked call site in `holds.service` for phase 7: `// phase 7: resolve under contract lock`.

## Do not

- Capture or void.
- Accept an amount from the browser.
- Call PayPal inside a database transaction.

## Exit check

- [ ] Phase 6 cases and L8 pass. CI is green and deployed. The `/pay/[shareId]` budget passes (≤ 140 KB JS), and Lighthouse mobile performance is ≥ 90.
- [ ] Second review pass done on the PayPal client and `holds.service` (money code).
- [ ] Manual on production: confirm a cabin plan, open Alex's link on a real phone, hold it with the sandbox buyer, and watch the board flip to Held live. Cancel once on Sam's link, see `declined`, then retry successfully.
- [ ] `learn/08-pay-and-hold.md` is written.

## Exit note

Authorization id:
