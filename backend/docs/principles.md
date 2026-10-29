# Engineering principles

Read this before changing the schema or any code that touches money. The full data design is in `docs/spec/data-model.md`.

1. **Store events, derive aggregates.** Counts such as how many shares are held are computed by queries, never stored. The `events` table is append-only (a trigger refuses updates).
2. **Constraints live in the schema.** Allowed statuses, allowed transitions, write-once fields, money math, id formats, and "sample rows have no PayPal ids" are CHECKs, foreign keys, unique indexes, and triggers. Application code may be wrong. The database must refuse. If code and a constraint disagree, the constraint wins and the code is wrong.
3. **Idempotency is enforced by UNIQUE indexes**, not by "we checked first". One in-flight PayPal call per share and one completion per idempotency key are indexes.
4. **Volatile state stays out of Postgres.** Rate-limit counters and socket rooms are in memory behind small interfaces. Postgres holds durable state only.
5. **Every recovery path reads from the database.** After a restart nothing is retried from memory. Unknown PayPal outcomes wait in the database until `sync` asks PayPal what happened.
6. **Money is integer cents. Time is `timestamptz`.** Timezones are applied only when presenting, using the contract's IANA zone.
7. **Migrations are forward-only.** Never edit an applied file (its checksum is verified). Add `NNNN_name.sql`. `reset` refuses to run in production.
8. **PayPal calls never run inside a database transaction.** Insert the pending operation and commit, call PayPal, then record the outcome in a second transaction.
9. **One service function owns each money change**, inside one transaction (and the contract advisory lock for capture and void).

## Error codes the database raises

| SQLSTATE | Meaning               | Where it comes from                                                                                                 |
| -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `23514`  | check violation       | CHECK constraints and our guard triggers. The `constraint` field names the rule, for example `contracts_transition` |
| `23505`  | unique violation      | UNIQUE indexes, for example `ops_one_inflight_per_share`                                                            |
| `23503`  | foreign key violation | for example `shares_contract_fk` (a sandbox share on a sample contract)                                             |

A service that sees one of these in production has a bug the schema caught. Log it at error level and return `500 internal`. Never loosen the constraint to make the error go away.

## Added by the independent review

10. **Guard the birth as well as the life.** Update triggers alone are not enough. A row is also checked when it is inserted, so an INSERT cannot skip the state machine. Sample seeds are the one exempt path.
11. **Least privilege.** The migrator owns the schema. The running app uses `foldback_app`, which has DML grants only: it cannot disable triggers, edit the transition tables, or delete events, operations, or `ai_usage`. Tests run as `foldback_app` so they prove what the app can and cannot do.
12. **Money moves only on "keep".** A capture (the operation row and the share status) requires the contract's decision to be `keep`. Void paths never require it.
13. **Never destroy live money.** A share that holds money (or may, after an unknown outcome) cannot be deleted, directly or by cascade. Cleanup jobs skip those rows. Settle or void first.
14. **The operation log is evidence.** Identity and request never change, outcomes move one way, and settled rows are frozen.
15. **Session-level locks need discipline.** Release the advisory lock on the same client in `finally`, and use a direct database connection (no transaction-mode pooler).
