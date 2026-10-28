import type { Pool } from "pg";
import { applyMigrations, migrationStatus, resetSchema } from "../../src/db/migrator";
import {
  count,
  createTestPool,
  expectDbError,
  insertAiUsage,
  insertContract,
  insertEvent,
  insertOperation,
  insertShare,
  insertUser,
  truncateAll,
} from "../helpers/db";

const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

let pool: Pool;
let firstRun: { applied: string[] };

beforeAll(async () => {
  pool = createTestPool();
  await resetSchema(pool);
  firstRun = await applyMigrations(pool);
});

beforeEach(async () => {
  await truncateAll(pool);
});

afterAll(async () => {
  await pool.end();
});

async function seedSandboxContract(overrides: Record<string, unknown> = {}) {
  const user = await insertUser(pool);
  const contract = await insertContract(pool, user["id"] as string, overrides);
  return { user, contract, contractId: contract["id"] as string };
}

describe("migrations", () => {
  it("1. apply once and are idempotent", async () => {
    expect(firstRun.applied).toEqual(["0001"]);
    expect((await applyMigrations(pool)).applied).toEqual([]);
    const status = await migrationStatus(pool);
    expect(status.applied.map((m) => m.version)).toEqual(["0001"]);
    expect(status.applied[0]?.checksumOk).toBe(true);
    expect(status.pending).toEqual([]);
  });
});

describe("contracts", () => {
  it("2. money math is enforced", async () => {
    const user = await insertUser(pool);
    await expectDbError(insertContract(pool, user["id"] as string, { share_cents: 5000 }), {
      code: CHECK_VIOLATION,
      constraint: "contracts_money_math",
    });
  });

  it("3. an illegal status transition is rejected, a legal one bumps the version", async () => {
    const { contractId } = await seedSandboxContract();
    await expectDbError(
      pool.query(
        "UPDATE contracts SET status = 'kept', direction = 'keep', resolved_at = now() WHERE id = $1",
        [contractId],
      ),
      { code: CHECK_VIOLATION, constraint: "contracts_transition" },
    );
    const ok = await pool.query<{ status: string; version: number }>(
      "UPDATE contracts SET status = 'grace' WHERE id = $1 RETURNING status, version",
      [contractId],
    );
    expect(ok.rows[0]).toEqual({ status: "grace", version: 2 });
  });

  it("4. direction is write-once", async () => {
    const { contractId } = await seedSandboxContract();
    await pool.query("UPDATE contracts SET status = 'capturing', direction = 'keep' WHERE id = $1", [
      contractId,
    ]);
    await expectDbError(
      pool.query("UPDATE contracts SET direction = 'release' WHERE id = $1", [contractId]),
      {
        code: CHECK_VIOLATION,
        constraint: "contracts_direction_write_once",
      },
    );
  });

  it("5. confirmed terms are frozen", async () => {
    const { contractId } = await seedSandboxContract();
    await expectDbError(pool.query("UPDATE contracts SET share_cents = 100 WHERE id = $1", [contractId]), {
      code: CHECK_VIOLATION,
      constraint: "contracts_confirmed_terms_immutable",
    });
    // the demo clock is allowed to move
    await pool.query("UPDATE contracts SET demo_now = '2026-11-06T18:30:00-08:00' WHERE id = $1", [
      contractId,
    ]);
  });
});

describe("shares", () => {
  it("6. sample rows cannot hold PayPal ids", async () => {
    const user = await insertUser(pool);
    const contract = await insertContract(pool, user["id"] as string, {
      money_source: "sample",
      seed_key: "cabin-hold",
    });
    const contractId = contract["id"] as string;
    const sample = { money_source: "sample", sample_label: "Sample — no PayPal hold" };
    await expectDbError(insertShare(pool, contractId, { ...sample, authorization_id: "A1" }), {
      code: CHECK_VIOLATION,
      constraint: "shares_sample_has_no_paypal_ids",
    });
    await expectDbError(insertShare(pool, contractId, { money_source: "sample" }), {
      code: CHECK_VIOLATION,
      constraint: "shares_sample_label",
    });
    await insertShare(pool, contractId, sample); // a clean sample share is fine
  });

  it("7. a contract cannot mix sample and sandbox shares", async () => {
    const user = await insertUser(pool);
    const contract = await insertContract(pool, user["id"] as string, {
      money_source: "sample",
      seed_key: "cabin-hold",
    });
    await expectDbError(insertShare(pool, contract["id"] as string), {
      code: FOREIGN_KEY_VIOLATION,
      constraint: "shares_contract_fk",
    });
  });

  it("8. held and kept sandbox shares need their PayPal ids", async () => {
    const { contractId } = await seedSandboxContract();
    await expectDbError(insertShare(pool, contractId, { status: "held" }), {
      code: CHECK_VIOLATION,
      constraint: "shares_hold_has_authorization",
    });
    await expectDbError(insertShare(pool, contractId, { status: "kept", authorization_id: "A1" }), {
      code: CHECK_VIOLATION,
      constraint: "shares_kept_has_capture",
    });
    await insertShare(pool, contractId, { status: "kept", authorization_id: "A1", capture_id: "C1" });
  });

  it("11. a contract has at most one grace subject", async () => {
    const { contractId } = await seedSandboxContract();
    await insertShare(pool, contractId, { position: 1, display_name: "Maya Shah", is_grace_subject: true });
    await expectDbError(
      insertShare(pool, contractId, { position: 2, display_name: "Sam Ortiz", is_grace_subject: true }),
      { code: UNIQUE_VIOLATION, constraint: "shares_one_grace_subject" },
    );
  });

  it("15. a share amount must equal the contract share", async () => {
    const { contractId } = await seedSandboxContract();
    await expectDbError(insertShare(pool, contractId, { amount_cents: 100 }), {
      code: CHECK_VIOLATION,
      constraint: "shares_amount_matches_contract",
    });
  });

  it("16. authorization and capture ids are write-once", async () => {
    const { contractId } = await seedSandboxContract();
    const share = await insertShare(pool, contractId, { status: "held", authorization_id: "A1" });
    const id = share["id"] as string;
    await expectDbError(pool.query("UPDATE shares SET authorization_id = 'A2' WHERE id = $1", [id]), {
      code: CHECK_VIOLATION,
      constraint: "shares_authorization_write_once",
    });
    await pool.query("UPDATE shares SET status = 'kept', capture_id = 'C1' WHERE id = $1", [id]);
    await expectDbError(pool.query("UPDATE shares SET capture_id = 'C2' WHERE id = $1", [id]), {
      code: CHECK_VIOLATION,
      constraint: "shares_capture_write_once",
    });
  });

  it("17. an illegal share transition is rejected", async () => {
    const { contractId } = await seedSandboxContract();
    const share = await insertShare(pool, contractId);
    await expectDbError(
      pool.query("UPDATE shares SET status = 'kept', capture_id = 'C1' WHERE id = $1", [share["id"]]),
      { code: CHECK_VIOLATION, constraint: "shares_transition" },
    );
  });
});

describe("paypal_operations", () => {
  it("9. only one mutating call can be in flight per share", async () => {
    const { contractId } = await seedSandboxContract();
    const share = await insertShare(pool, contractId);
    const shareId = share["id"] as string;
    await insertOperation(pool, shareId, { kind: "authorize", outcome: "pending" });
    await expectDbError(insertOperation(pool, shareId, { kind: "capture", outcome: "unknown" }), {
      code: UNIQUE_VIOLATION,
      constraint: "ops_one_inflight_per_share",
    });
    // reads do not count as in-flight mutations, and neither do finished calls
    await insertOperation(pool, shareId, { kind: "get_order", idempotency_key: null, outcome: "pending" });
    await insertOperation(pool, shareId, { kind: "capture", outcome: "failed" });
  });

  it("10. an idempotency key completes at most once", async () => {
    const { contractId } = await seedSandboxContract();
    const share = await insertShare(pool, contractId);
    const shareId = share["id"] as string;
    await insertOperation(pool, shareId, {
      kind: "capture",
      idempotency_key: "fb-capture-A1",
      outcome: "failed",
    });
    await insertOperation(pool, shareId, {
      kind: "capture",
      idempotency_key: "fb-capture-A1",
      outcome: "completed",
    });
    await expectDbError(
      insertOperation(pool, shareId, {
        kind: "capture",
        idempotency_key: "fb-capture-A1",
        outcome: "completed",
      }),
      { code: UNIQUE_VIOLATION, constraint: "ops_one_completion_per_key" },
    );
  });
});

describe("events", () => {
  it("12. are append-only", async () => {
    const { contractId } = await seedSandboxContract();
    const event = await insertEvent(pool, contractId);
    await expectDbError(pool.query("UPDATE events SET detail = 'edited' WHERE id = $1", [event["id"]]), {
      code: CHECK_VIOLATION,
      constraint: "events_append_only",
    });
  });
});

describe("users and ai_usage", () => {
  it("13. deleting a guest removes everything they made but keeps ai_usage", async () => {
    const guest = await insertUser(pool, {
      kind: "guest",
      email: null,
      password_hash: null,
      expires_at: "2026-11-08T12:00:00-08:00",
    });
    const guestId = guest["id"] as string;
    const contract = await insertContract(pool, guestId);
    const share = await insertShare(pool, contract["id"] as string);
    await insertOperation(pool, share["id"] as string);
    await insertEvent(pool, contract["id"] as string, { share_id: share["id"] });
    await insertAiUsage(pool, { user_id: guestId });

    await pool.query("DELETE FROM users WHERE id = $1", [guestId]);

    for (const table of ["contracts", "shares", "paypal_operations", "events"]) {
      expect(await count(pool, table)).toBe(0);
    }
    const usage = await pool.query<{ user_id: string | null }>("SELECT user_id FROM ai_usage");
    expect(usage.rows).toEqual([{ user_id: null }]);
  });

  it("14. ai_usage refuses paid OpenRouter models", async () => {
    await expectDbError(
      insertAiUsage(pool, { provider: "openrouter", model: "anthropic/claude-3.5-sonnet" }),
      { code: CHECK_VIOLATION, constraint: "ai_usage_free_only" },
    );
    await insertAiUsage(pool, { provider: "openrouter", model: "openrouter/free" });
    await insertAiUsage(pool, { provider: "openrouter", model: "nvidia/nemotron-3.5-super-vl:free" });
    await insertAiUsage(pool, { provider: "groq", model: "openai/gpt-oss-120b" });
  });
});
