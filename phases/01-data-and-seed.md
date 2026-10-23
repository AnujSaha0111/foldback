# Phase 1 — Data and seed

Budget: 4 hours. Owner: PayPal owner. Depends on phase 0.

## Read

- `data-model.md`
- `api.md` sections Health, Demo reset, List and read
- `architecture.md` invariants
- `test.md` cases marked phase 1

## Goal

An empty database boots into the two sample contracts. Reset returns to that same pair. Sample rows cannot be mistaken for sandbox rows in the JSON.

## Do not

- Do not call PayPal or the model.
- Do not build the Rule screen beyond a placeholder link if phase 0's spike UI is still the index. A JSON API is the exit, not pixels.
- Do not add tables that `data-model.md` does not list.
- Do not insert fake capture ids on sample rows.

## Create

```text
app/server/src/db.ts
app/server/src/seed.ts
app/server/src/routes/demo.ts
app/server/src/routes/contracts.ts     list and get only
app/shared/src/statuses.ts
app/server/test/seed.test.ts
```

`db.ts` runs the `CREATE TABLE` statements on startup. Generate ids with `crypto.randomBytes`. `seed_key` is unique.

`seed.ts` exports `seedIfEmpty()` and `resetDemo()`. Both insert `cabin-hold` and `print-full` exactly as `data-model.md` describes. Copy rule text from the constants that phase 2 will share. For this phase, put the two paste strings in `app/shared/src/rules.ts` so later tests import them. The strings must match `demo.md` character for character.

Wire `GET /api/health`, `GET /api/contracts`, `GET /api/contracts/:id`, and `POST /api/demo/reset`.

`paid_count` and `held_count` follow `api.md`. For the cabin seed, `held_count` is 3 and `paid_count` is 3. For the print-run seed, both are 4.

## Exit check

`npm test` passes the phase 1 cases in `test.md`:

- Reset twice yields two contracts and the cabin share names Alex Chen, Sam Ortiz, Jordan Lee, Maya Shah.
- Maya is the only `is_grace_subject` on the cabin.
- Every sample share has null `order_id`, `capture_id`, and `refund_id`.
- Print-run `demo_now` is after `deadline_at`. Cabin `demo_now` is before `deadline_at`.
- `GET /api/contracts/:id` includes those nulls and `sample_label`.

Manual: `curl` reset and confirm the warning string about leftover sandbox captures.

## Exit note

Command run and result:
