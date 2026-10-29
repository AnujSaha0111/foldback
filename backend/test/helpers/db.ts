import { Pool } from "pg";
import type { QueryResult, QueryResultRow } from "pg";
import { newId } from "../../src/db/ids";
import { applyMigrations, resetSchema } from "../../src/db/migrator";
import { withTransaction } from "../../src/db/tx";

const TEST_DATABASE_URL =
  process.env["TEST_DATABASE_URL"] ?? "postgres://foldback:foldback@localhost:5433/foldback_test";
const APP_ROLE = "foldback_app";
const APP_ROLE_PASSWORD = "foldback_app";

type Row = Record<string, unknown>;

/** Anything that can run a query: a Pool or a checked-out client. */
export interface Queryable {
  query<R extends QueryResultRow = Row>(text: string, values?: unknown[]): Promise<QueryResult<R>>;
}

export interface Pools {
  /** Connects as the table owner (used to reset, truncate, and to test trigger-only rules). */
  owner: Pool;
  /** Connects as `foldback_app`, a non-owner with DML grants only. The application's view of the database. */
  app: Pool;
}

export function createPools(): Pools {
  const appUrl = new URL(TEST_DATABASE_URL);
  appUrl.username = APP_ROLE;
  appUrl.password = APP_ROLE_PASSWORD;
  return {
    owner: new Pool({ connectionString: TEST_DATABASE_URL, max: 3 }),
    app: new Pool({ connectionString: appUrl.toString(), max: 6 }),
  };
}

/** Creates the app role, rebuilds the schema from the migration files, and returns what was applied. */
export async function prepareDatabase(owner: Pool): Promise<{ applied: string[] }> {
  await owner.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
        CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_ROLE_PASSWORD}';
      END IF;
    END $$`);
  await resetSchema(owner);
  return applyMigrations(owner);
}

/** Empties every table the app writes to. The transition lookup tables are left alone. */
export async function truncateAll(owner: Pool): Promise<void> {
  await owner.query(
    "TRUNCATE users, contracts, shares, paypal_operations, events, ai_usage RESTART IDENTITY CASCADE",
  );
}

// The same id format and transaction wrapper the application uses, so the tests cannot drift from it.
export { newId, withTransaction };

/** Asserts a Postgres error with the given SQLSTATE and (optionally) constraint name. */
export async function expectDbError(
  promise: Promise<unknown>,
  expected: { code: string; constraint?: string },
): Promise<void> {
  await expect(promise).rejects.toMatchObject(expected);
}

export async function count(
  q: Queryable,
  table: string,
  where = "true",
  values: unknown[] = [],
): Promise<number> {
  const res = await q.query<{ n: string }>(`SELECT count(*) AS n FROM ${table} WHERE ${where}`, values);
  return Number(res.rows[0]?.n ?? 0);
}

// ---------------------------------------------------------------------------
// Fixtures. They walk the same lifecycle the application will, because the schema
// refuses rows that skip it.
// ---------------------------------------------------------------------------

export async function member(q: Queryable): Promise<string> {
  const id = newId("usr");
  await q.query(
    "INSERT INTO users (id, kind, email, password_hash, display_name) VALUES ($1, 'member', $2, '$argon2id$x', 'M')",
    [id, `${id}@x.test`],
  );
  return id;
}

/** An expired guest, so cleanup queries match it. */
export async function guest(q: Queryable): Promise<string> {
  const id = newId("usr");
  await q.query(
    "INSERT INTO users (id, kind, display_name, expires_at) VALUES ($1, 'guest', 'G', now() - interval '1 day')",
    [id],
  );
  return id;
}

/** A sandbox contract walked to awaiting_confirmation with every term filled in. */
export async function draft(
  q: Queryable,
  owner: string,
  opts: { headcount?: number; share?: number; grace?: string | null } = {},
): Promise<string> {
  const headcount = opts.headcount ?? 2;
  const share = opts.share ?? 8000;
  const grace = opts.grace ?? null;
  const id = newId("con");
  await q.query(
    `INSERT INTO contracts (id, owner_id, rule_text, rule_hash, reference_at, status, money_source)
     VALUES ($1, $2, 'cabin', 'h1', now(), 'extracting', 'sandbox')`,
    [id, owner],
  );
  await q.query(
    `UPDATE contracts SET status = 'awaiting_confirmation', title = 'Cabin', currency = 'USD',
       total_cents = $1, share_cents = $2, headcount = $3, deadline_at = now() + interval '1 day',
       timezone = 'America/Los_Angeles', grace_person_name = $4::text,
       grace_until = CASE WHEN $4::text IS NULL THEN NULL ELSE now() + interval '3 days' END
     WHERE id = $5`,
    [headcount * share, share, headcount, grace, id],
  );
  return id;
}

export async function addShares(
  q: Queryable,
  contractId: string,
  names: string[],
  opts: { share?: number; grace?: string | null } = {},
): Promise<string[]> {
  const ids: string[] = [];
  for (const [i, name] of names.entries()) {
    const id = newId("shr");
    await q.query(
      `INSERT INTO shares (id, contract_id, money_source, position, display_name, is_grace_subject, status, amount_cents)
       VALUES ($1, $2, 'sandbox', $3, $4, $5, 'waiting', $6)`,
      [id, contractId, i + 1, name, name === (opts.grace ?? null), opts.share ?? 8000],
    );
    ids.push(id);
  }
  return ids;
}

/** Draft, shares, and confirm in ONE transaction, which the deferred activation check requires. */
export async function confirmed(
  app: Pool,
  owner: string,
  names: string[] = ["A", "B"],
  grace: string | null = null,
): Promise<{ contractId: string; shareIds: string[] }> {
  return withTransaction(app, async (client) => {
    const contractId = await draft(client, owner, { headcount: names.length, grace });
    const shareIds = await addShares(client, contractId, names, { grace });
    await client.query(
      "UPDATE contracts SET status = 'active', confirmed_at = now(), demo_now = now() WHERE id = $1",
      [contractId],
    );
    return { contractId, shareIds };
  });
}

export function insertOperation(
  q: Queryable,
  shareId: string,
  kind: string,
  key: string | null,
  outcome = "pending",
  id: string = newId("op"),
): Promise<QueryResult> {
  return q.query(
    `INSERT INTO paypal_operations (id, share_id, kind, idempotency_key, request, outcome)
     VALUES ($1, $2, $3, $4, '{}', $5)`,
    [id, shareId, kind, key, outcome],
  );
}

/** Walks one share to `held` through the real operation protocol (create order, then authorize). */
export async function hold(q: Queryable, shareId: string, n: number): Promise<void> {
  const createOp = newId("op");
  await insertOperation(q, shareId, "create_order", `co:${shareId}:1`, "pending", createOp);
  await q.query(
    `UPDATE shares SET status = 'checkout_open', checkout_attempt = 1, order_id = $1,
       approve_url = 'https://www.sandbox.paypal.com/checkoutnow?token=x' WHERE id = $2`,
    [`ORD${n}`, shareId],
  );
  await q.query("UPDATE paypal_operations SET outcome = 'completed', response = '{}' WHERE id = $1", [
    createOp,
  ]);
  const authOp = newId("op");
  await insertOperation(q, shareId, "authorize", `au:${shareId}`, "pending", authOp);
  await q.query("UPDATE shares SET status = 'held', authorization_id = $1 WHERE id = $2", [
    `AUTH${n}`,
    shareId,
  ]);
  await q.query("UPDATE paypal_operations SET outcome = 'completed' WHERE id = $1", [authOp]);
}

/** A sample (seed) contract inserted directly in its final status, as the application's seeding does. */
export async function seedContract(app: Pool, owner: string, key = "cabin-hold"): Promise<string> {
  const id = newId("con");
  await withTransaction(app, async (client) => {
    await client.query(
      `INSERT INTO contracts (id, owner_id, seed_key, rule_text, rule_hash, reference_at, status, direction,
         money_source, currency, total_cents, share_cents, headcount, deadline_at, timezone, demo_now,
         confirmed_at, title, resolved_at)
       VALUES ($1, $2, $3, 'seed', 'hs', now(), 'kept', 'keep', 'sample', 'USD', 200, 100, 2, now(), 'UTC',
         now(), now(), 'Seed', now())`,
      [id, owner, key],
    );
    for (const position of [1, 2]) {
      await client.query(
        `INSERT INTO shares (id, contract_id, money_source, position, display_name, status, amount_cents, sample_label)
         VALUES ($1, $2, 'sample', $3, $4, 'kept', 100, 'demo')`,
        [newId("shr"), id, position, `P${position}`],
      );
    }
  });
  return id;
}
