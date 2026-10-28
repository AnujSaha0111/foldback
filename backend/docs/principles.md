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
