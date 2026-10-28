# Phase 1 — Database design

Budget: 5 hours. Hat: Data. Depends on phase 0. Dates: 29–30 October 2026.

## Read

- `data-model.md` (all of it)
- `architecture.md`: Money state machine, Concurrency, Invariants
- `test.md`: phase 1 cases

## Goal

The schema is designed, reviewed with you, and real: `0001_init.sql` applies cleanly to Postgres 16, and tests prove the database itself refuses bad states.

## Steps

1. **Review session (with you).** Walk through `data-model.md` table by table using the checklist below. Every change you ask for goes into `data-model.md` first.
2. Scaffold `backend/` as its own Yarn package (`yarn init`, TS strict, ESLint 9, Jest 30 + ts-jest). Only what this phase needs.
3. Write `backend/migrations/0001_init.sql`: extension, tables, indexes, transition tables with their rows, trigger functions, and triggers.
4. Write `backend/scripts/migrate.ts` with `migrate`, `status`, and `reset`, plus checksums.
5. Write `backend/docs/principles.md` from the Principles section of `data-model.md`.
6. Write `deploy/compose.dev.yml` with `postgres:16` on 5432 and a tmpfs test instance on 5433.
7. Write the constraint tests.

## Review checklist

- [ ] Every status list matches `architecture.md` exactly.
- [ ] Every allowed transition is in a transition table, and nothing else is.
- [ ] Money: integer cents, positive, total = headcount × share.
- [ ] Idempotency: unique indexes for one in-flight call per share and one completion per key.
- [ ] Write-once fields: `direction`, `authorization_id`, `capture_id`, and the money fields after confirm.
- [ ] Ownership: every organizer-facing row reaches `users` through `owner_id`.
- [ ] The cascade path deletes a guest completely.
- [ ] Indexes exist for every hot query (contract by owner, shares by contract, events by contract, AI usage by day).
- [ ] No column stores something that can be derived.

## Create

```text
backend/package.json  backend/yarn.lock  backend/tsconfig.json  backend/jest.config.ts  backend/eslint.config.mjs
backend/migrations/0001_init.sql
backend/scripts/migrate.ts             thin CLI over src/db/migrator.ts
backend/src/db/migrator.ts             applyMigrations, migrationStatus, migrationsCurrent, resetSchema
backend/.env.example
backend/docs/principles.md
backend/test/integration/schema.test.ts
backend/test/helpers/db.ts             create the test schema, truncate between tests
deploy/compose.dev.yml
```

## Do not

- Add an ORM or a query builder.
- Write services or routes (phase 3).
- Put business logic in triggers beyond the guards listed in `data-model.md`.

## Exit check

- [ ] `yarn migrate` then `yarn migrate status` show `0001` applied. A second `migrate` is a no-op.
- [ ] Phase 1 cases 1–17 in `test.md` pass against real Postgres.
- [ ] `yarn typecheck` and `yarn lint` are clean.
- [ ] `learn/03-database.md` is written.

## Exit note

Changes made during the review:
