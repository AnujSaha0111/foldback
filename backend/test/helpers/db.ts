import { randomBytes } from "node:crypto";
import { Pool } from "pg";

export const TEST_DATABASE_URL =
  process.env["TEST_DATABASE_URL"] ?? "postgres://foldback:foldback@localhost:5433/foldback_test";

export type Row = Record<string, unknown>;

export function createTestPool(): Pool {
  return new Pool({ connectionString: TEST_DATABASE_URL, max: 4 });
}

/** 128 random bits as 22 base64url characters, the id format the schema requires. */
export function newId(prefix: "usr" | "con" | "shr" | "op"): string {
  return `${prefix}_${randomBytes(16).toString("base64url")}`;
}

/** Empties every table the app writes to. The transition lookup tables are left alone. */
export async function truncateAll(pool: Pool): Promise<void> {
  await pool.query(
    "TRUNCATE users, contracts, shares, paypal_operations, events, ai_usage RESTART IDENTITY CASCADE",
  );
}

async function insert(pool: Pool, table: string, row: Row): Promise<Row> {
  const cols = Object.keys(row);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const res = await pool.query<Row>(
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
    Object.values(row),
  );
  const created = res.rows[0];
  if (!created) throw new Error(`insert into ${table} returned no row`);
  return created;
}

let counter = 0;

export function insertUser(pool: Pool, overrides: Row = {}): Promise<Row> {
  counter += 1;
  return insert(pool, "users", {
    id: newId("usr"),
    kind: "member",
    email: `person${counter}@example.com`,
    password_hash: "not-a-real-hash",
    display_name: "Test Person",
    ...overrides,
  });
}

/** A confirmed, active sandbox contract: the cabin plan, 4 x $80. */
export function insertContract(pool: Pool, ownerId: string, overrides: Row = {}): Promise<Row> {
  return insert(pool, "contracts", {
    id: newId("con"),
    owner_id: ownerId,
    title: "Cabin",
    rule_text: "The cabin is $320. We need 4 people at $80 each by Friday 6pm Pacific.",
    rule_hash: "hash",
    reference_at: "2026-11-01T12:00:00-08:00",
    status: "active",
    money_source: "sandbox",
    currency: "USD",
    total_cents: 32000,
    share_cents: 8000,
    headcount: 4,
    deadline_at: "2026-11-06T18:00:00-08:00",
    timezone: "America/Los_Angeles",
    demo_now: "2026-11-06T16:00:00-08:00",
    confirmed_at: "2026-11-01T12:00:00-08:00",
    ...overrides,
  });
}

/** A sandbox share in `waiting`. Override `position` and `display_name` when adding more than one. */
export function insertShare(pool: Pool, contractId: string, overrides: Row = {}): Promise<Row> {
  return insert(pool, "shares", {
    id: newId("shr"),
    contract_id: contractId,
    money_source: "sandbox",
    position: 1,
    display_name: "Alex Chen",
    status: "waiting",
    amount_cents: 8000,
    ...overrides,
  });
}

export function insertOperation(pool: Pool, shareId: string, overrides: Row = {}): Promise<Row> {
  return insert(pool, "paypal_operations", {
    id: newId("op"),
    share_id: shareId,
    kind: "authorize",
    idempotency_key: `fb-auth-${randomBytes(6).toString("hex")}`,
    request: { path: "/v2/checkout/orders/X/authorize" },
    outcome: "pending",
    ...overrides,
  });
}

export function insertEvent(pool: Pool, contractId: string, overrides: Row = {}): Promise<Row> {
  return insert(pool, "events", {
    contract_id: contractId,
    type: "rule_confirmed",
    detail: "Terms confirmed.",
    occurred_at: "2026-11-01T12:00:00-08:00",
    ...overrides,
  });
}

export function insertAiUsage(pool: Pool, overrides: Row = {}): Promise<Row> {
  return insert(pool, "ai_usage", {
    day: "2026-11-01",
    route: "extract",
    provider: "gemini",
    model: "gemini-3.5-flash-lite",
    ip_hash: "hash",
    input_tokens: 300,
    output_tokens: 200,
    succeeded: true,
    ...overrides,
  });
}

/** Asserts a Postgres error with the given SQLSTATE and (optionally) constraint name. */
export async function expectDbError(
  promise: Promise<unknown>,
  expected: { code: string; constraint?: string },
): Promise<void> {
  await expect(promise).rejects.toMatchObject(expected);
}

export async function count(pool: Pool, table: string): Promise<number> {
  const res = await pool.query<{ n: string }>(`SELECT count(*) AS n FROM ${table}`);
  return Number(res.rows[0]?.n ?? 0);
}
