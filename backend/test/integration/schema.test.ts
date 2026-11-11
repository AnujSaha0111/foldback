import type { Pool } from "pg";
import { mkdtemp, cp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { applyMigrations, migrationStatus, migrationsCurrent } from "../../src/db/migrator";
import {
  addShares,
  confirmed,
  count,
  createPools,
  draft,
  expectDbError,
  guest,
  hold,
  insertOperation,
  member,
  newId,
  prepareDatabase,
  seedContract,
  truncateAll,
  withTransaction,
  type Pools,
} from "../helpers/db";

const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const INSUFFICIENT_PRIVILEGE = "42501";
const LOCK_NOT_AVAILABLE = "55P03";

let pools: Pools;
let app: Pool;
let owner: Pool;
let firstRun: { applied: string[] };
let user: string;

beforeAll(async () => {
  pools = createPools();
  app = pools.app;
  owner = pools.owner;
  firstRun = await prepareDatabase(owner);
});

beforeEach(async () => {
  await truncateAll(owner);
  user = await member(app);
});

afterAll(async () => {
  await pools.app.end();
  await pools.owner.end();
});

const NEW_CONTRACT_SQL = `INSERT INTO contracts (id, owner_id, rule_text, rule_hash, reference_at, status, money_source,
  total_cents, share_cents, headcount) VALUES ($1, $2, 'x', 'h', now(), 'extracting', 'sandbox', $3, $4, $5)`;

describe("migrations", () => {
  it("still count as current when a newer image applied one this code does not know (rollback)", async () => {
    await owner.query(
      "INSERT INTO schema_migrations (version, name, checksum) VALUES ('9999', 'newer', 'x')",
    );
    try {
      expect(await migrationsCurrent(app)).toBe(true);
    } finally {
      await owner.query("DELETE FROM schema_migrations WHERE version = '9999'");
    }
  });

  it("are not current while a file of this code is still pending", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "migrations-"));
    await cp(path.resolve(__dirname, "../../migrations"), dir, { recursive: true });
    await writeFile(path.join(dir, "9998_pending.sql"), "SELECT 1;");
    expect(await migrationsCurrent(app, dir)).toBe(false);
  });

  it("1. apply once and are idempotent", async () => {
    expect(firstRun.applied).toEqual(["0001", "0002"]);
    expect((await applyMigrations(owner)).applied).toEqual([]);
    const status = await migrationStatus(owner);
    expect(status.applied.map((m) => m.version)).toEqual(["0001", "0002"]);
    expect(status.applied.every((m) => m.checksumOk)).toBe(true);
    expect(status.pending).toEqual([]);
  });
});

describe("contracts", () => {
  it("2. money math is enforced, and overflow is a 23514 refusal", async () => {
    await expectDbError(app.query(NEW_CONTRACT_SQL, [newId("con"), user, 100, 30, 3]), {
      code: CHECK_VIOLATION,
      constraint: "contracts_money_math",
    });
    await expectDbError(app.query(NEW_CONTRACT_SQL, [newId("con"), user, 100, 2_000_000_000, 4]), {
      code: CHECK_VIOLATION,
    });
  });

  it("3. an illegal transition is rejected, a legal update bumps the version", async () => {
    const contractId = await draft(app, user);
    const before = await app.query<{ version: number }>("SELECT version FROM contracts WHERE id = $1", [
      contractId,
    ]);
    await expectDbError(app.query("UPDATE contracts SET status = 'kept' WHERE id = $1", [contractId]), {
      code: CHECK_VIOLATION,
      constraint: "contracts_transition",
    });
    await app.query("UPDATE contracts SET clarify_rounds = 1 WHERE id = $1", [contractId]);
    const after = await app.query<{ version: number }>("SELECT version FROM contracts WHERE id = $1", [
      contractId,
    ]);
    expect(after.rows[0]?.version).toBe((before.rows[0]?.version ?? 0) + 1);
  });

  it("4. direction is write-once", async () => {
    const { contractId } = await confirmed(app, user);
    await app.query("UPDATE contracts SET status = 'releasing', direction = 'release' WHERE id = $1", [
      contractId,
    ]);
    await expectDbError(app.query("UPDATE contracts SET direction = 'keep' WHERE id = $1", [contractId]), {
      code: CHECK_VIOLATION,
      constraint: "contracts_direction_write_once",
    });
  });

  it("5. confirmed terms are frozen, including rule_hash", async () => {
    const { contractId } = await confirmed(app, user);
    for (const column of ["share_cents = 1", "rule_hash = 'other'"]) {
      await expectDbError(app.query(`UPDATE contracts SET ${column} WHERE id = $1`, [contractId]), {
        code: CHECK_VIOLATION,
        constraint: "contracts_confirmed_terms_immutable",
      });
    }
  });

  it("N1. a sandbox contract cannot be born kept", async () => {
    await expectDbError(
      app.query(
        `INSERT INTO contracts (id, owner_id, rule_text, rule_hash, reference_at, status, direction, money_source,
           currency, total_cents, share_cents, headcount, deadline_at, timezone, demo_now, confirmed_at, title, resolved_at)
         VALUES ($1, $2, 'x', 'h', now(), 'kept', 'keep', 'sandbox', 'USD', 200, 100, 2, now(), 'UTC', now(), now(), 't', now())`,
        [newId("con"), user],
      ),
      { code: CHECK_VIOLATION, constraint: "contracts_insert_state" },
    );
  });

  it("N10. the UTC timezone is accepted, and confirmed_at only exists after confirm", async () => {
    await app.query(
      `INSERT INTO contracts (id, owner_id, rule_text, rule_hash, reference_at, status, money_source, timezone)
       VALUES ($1, $2, 'x', 'h', now(), 'extracting', 'sandbox', 'UTC')`,
      [newId("con"), user],
    );
    await expectDbError(
      app.query(
        `INSERT INTO contracts (id, owner_id, rule_text, rule_hash, reference_at, status, money_source, confirmed_at)
         VALUES ($1, $2, 'x', 'h', now(), 'extracting', 'sandbox', now())`,
        [newId("con"), user],
      ),
      { code: CHECK_VIOLATION, constraint: "contracts_confirmed_at_matches_status" },
    );
  });

  it("N3. confirm commits only if the shares match headcount, amount, and grace subject", async () => {
    const wrongCount = withTransaction(app, async (client) => {
      const contractId = await draft(client, user, { headcount: 3 });
      await addShares(client, contractId, ["A", "B"]);
      await client.query(
        "UPDATE contracts SET status = 'active', confirmed_at = now(), demo_now = now() WHERE id = $1",
        [contractId],
      );
    });
    await expectDbError(wrongCount, { code: CHECK_VIOLATION, constraint: "contracts_shares_match_terms" });

    const noGraceSubject = withTransaction(app, async (client) => {
      const contractId = await draft(client, user, { headcount: 2, grace: "Maya" });
      await addShares(client, contractId, ["A", "B"]); // nobody flagged as the grace subject
      await client.query(
        "UPDATE contracts SET status = 'active', confirmed_at = now(), demo_now = now() WHERE id = $1",
        [contractId],
      );
    });
    await expectDbError(noGraceSubject, {
      code: CHECK_VIOLATION,
      constraint: "contracts_shares_match_terms",
    });

    await confirmed(app, user, ["A", "Maya"], "Maya"); // the right shape commits
  });

  it("N12. happy path: hold all, keep, capture through an unknown plus sync, kept", async () => {
    const { contractId, shareIds } = await confirmed(app, user, ["A", "B"]);
    for (const [i, shareId] of shareIds.entries()) await hold(app, shareId, 120 + i);
    await app.query("UPDATE contracts SET status = 'capturing', direction = 'keep' WHERE id = $1", [
      contractId,
    ]);
    for (const [i, shareId] of shareIds.entries()) {
      const op = newId("op");
      await insertOperation(app, shareId, "capture", `cap:${shareId}`, "pending", op);
      if (i === 0) {
        await app.query("UPDATE shares SET status = 'capture_unknown' WHERE id = $1", [shareId]);
        await app.query("UPDATE paypal_operations SET outcome = 'unknown' WHERE id = $1", [op]);
        await app.query("UPDATE contracts SET status = 'blocked' WHERE id = $1", [contractId]);
        await app.query(
          "UPDATE paypal_operations SET outcome = 'completed', resolved_by_sync = true WHERE id = $1",
          [op],
        );
        await app.query("UPDATE shares SET status = 'kept', capture_id = $1 WHERE id = $2", [
          `CAP${i}`,
          shareId,
        ]);
        await app.query("UPDATE contracts SET status = 'capturing' WHERE id = $1", [contractId]);
      } else {
        await app.query("UPDATE shares SET status = 'kept', capture_id = $1 WHERE id = $2", [
          `CAP${i}`,
          shareId,
        ]);
        await app.query("UPDATE paypal_operations SET outcome = 'completed' WHERE id = $1", [op]);
      }
    }
    await app.query("UPDATE contracts SET status = 'kept', resolved_at = now() WHERE id = $1", [contractId]);
    await expectDbError(
      app.query("UPDATE contracts SET status = 'active', direction = NULL WHERE id = $1", [contractId]),
      { code: CHECK_VIOLATION },
    );
  });
});

describe("shares", () => {
  it("6. sample rows hold no PayPal ids, seeds insert in their final status, and no operations on samples", async () => {
    const contractId = await seedContract(app, user);
    await expectDbError(
      app.query(
        `INSERT INTO shares (id, contract_id, money_source, position, display_name, status, amount_cents, sample_label, order_id)
         VALUES ($1, $2, 'sample', 3, 'Z', 'kept', 100, 'demo', 'ORDX')`,
        [newId("shr"), contractId],
      ),
      { code: CHECK_VIOLATION, constraint: "shares_sample_has_no_paypal_ids" },
    );
    const sample = await app.query<{ id: string }>("SELECT id FROM shares WHERE contract_id = $1 LIMIT 1", [
      contractId,
    ]);
    await expectDbError(insertOperation(app, sample.rows[0]?.id ?? "", "void", "k"), {
      code: CHECK_VIOLATION,
      constraint: "ops_sandbox_only",
    });
  });

  it("7. a contract cannot mix sample and sandbox shares", async () => {
    const contractId = await seedContract(app, user, "print-full");
    await expectDbError(
      app.query(
        `INSERT INTO shares (id, contract_id, money_source, position, display_name, status, amount_cents)
         VALUES ($1, $2, 'sandbox', 3, 'Z', 'waiting', 100)`,
        [newId("shr"), contractId],
      ),
      { code: FOREIGN_KEY_VIOLATION, constraint: "shares_contract_fk" },
    );
  });

  it("8. a held sandbox share needs its authorization id", async () => {
    const { shareIds } = await confirmed(app, user);
    await app.query("UPDATE shares SET status = 'checkout_open' WHERE id = $1", [shareIds[0]]);
    await expectDbError(app.query("UPDATE shares SET status = 'held' WHERE id = $1", [shareIds[0]]), {
      code: CHECK_VIOLATION,
      constraint: "shares_hold_has_authorization",
    });
  });

  it("11. a contract has at most one grace subject", async () => {
    const contractId = await draft(app, user, { headcount: 3, grace: "Maya" });
    await addShares(app, contractId, ["A", "Maya"], { grace: "Maya" });
    await expectDbError(
      app.query(
        `INSERT INTO shares (id, contract_id, money_source, position, display_name, is_grace_subject, status, amount_cents)
         VALUES ($1, $2, 'sandbox', 3, 'Maya2', true, 'waiting', 8000)`,
        [newId("shr"), contractId],
      ),
      { code: UNIQUE_VIOLATION, constraint: "shares_one_grace_subject" },
    );
  });

  it("15. a share amount must equal the contract share", async () => {
    const contractId = await draft(app, user);
    await expectDbError(
      app.query(
        `INSERT INTO shares (id, contract_id, money_source, position, display_name, status, amount_cents)
         VALUES ($1, $2, 'sandbox', 1, 'A', 'waiting', 7999)`,
        [newId("shr"), contractId],
      ),
      { code: CHECK_VIOLATION, constraint: "shares_amount_matches_contract" },
    );
  });

  it("16. the authorization id is write-once", async () => {
    const { shareIds } = await confirmed(app, user);
    await hold(app, shareIds[0] ?? "", 160);
    await expectDbError(
      app.query("UPDATE shares SET authorization_id = 'OTHER' WHERE id = $1", [shareIds[0]]),
      {
        code: CHECK_VIOLATION,
        constraint: "shares_authorization_write_once",
      },
    );
  });

  it("17. an illegal share transition is rejected", async () => {
    const { shareIds } = await confirmed(app, user);
    await expectDbError(app.query("UPDATE shares SET status = 'released' WHERE id = $1", [shareIds[0]]), {
      code: CHECK_VIOLATION,
      constraint: "shares_transition",
    });
  });

  it("N2. a sandbox share is born waiting, inside the headcount, and never after confirm", async () => {
    const contractId = await draft(app, user);
    await expectDbError(
      app.query(
        `INSERT INTO shares (id, contract_id, money_source, position, display_name, status, amount_cents, authorization_id, capture_id)
         VALUES ($1, $2, 'sandbox', 1, 'A', 'kept', 8000, 'AU', 'CA')`,
        [newId("shr"), contractId],
      ),
      { code: CHECK_VIOLATION, constraint: "shares_insert_state" },
    );
    const insertThird = `INSERT INTO shares (id, contract_id, money_source, position, display_name, status, amount_cents)
                         VALUES ($1, $2, 'sandbox', 3, 'C', 'waiting', 8000)`;
    await expectDbError(app.query(insertThird, [newId("shr"), contractId]), {
      code: CHECK_VIOLATION,
      constraint: "shares_fit_contract_terms",
    });
    const confirmedContract = await confirmed(app, user);
    await expectDbError(app.query(insertThird, [newId("shr"), confirmedContract.contractId]), {
      code: CHECK_VIOLATION,
      constraint: "shares_set_frozen_after_confirm",
    });
  });

  it("N5. a share with an authorize in flight cannot be expired", async () => {
    const { shareIds } = await confirmed(app, user);
    const shareId = shareIds[0] ?? "";
    await insertOperation(app, shareId, "create_order", "c5");
    await app.query("UPDATE shares SET status = 'checkout_open', order_id = 'ORD5' WHERE id = $1", [shareId]);
    await app.query("UPDATE paypal_operations SET outcome = 'completed' WHERE share_id = $1", [shareId]);
    await insertOperation(app, shareId, "authorize", "a5");
    await expectDbError(app.query("UPDATE shares SET status = 'expired' WHERE id = $1", [shareId]), {
      code: CHECK_VIOLATION,
      constraint: "shares_no_expire_inflight",
    });
  });

  it("N4. nothing is captured unless the decision is keep", async () => {
    const { contractId, shareIds } = await confirmed(app, user);
    const shareId = shareIds[0] ?? "";
    await hold(app, shareId, 40);
    await app.query("UPDATE contracts SET status = 'releasing', direction = 'release' WHERE id = $1", [
      contractId,
    ]);
    await expectDbError(insertOperation(app, shareId, "capture", "c4"), {
      code: CHECK_VIOLATION,
      constraint: "ops_capture_requires_keep",
    });
    await expectDbError(
      app.query("UPDATE shares SET status = 'kept', capture_id = 'CAPX' WHERE id = $1", [shareId]),
      { code: CHECK_VIOLATION, constraint: "shares_capture_requires_keep" },
    );
  });

  it("N9. a capture id never sits on a released share", async () => {
    const { shareIds } = await confirmed(app, user);
    const shareId = shareIds[0] ?? "";
    await hold(app, shareId, 90);
    await expectDbError(
      app.query("UPDATE shares SET status = 'released', capture_id = 'CAP9' WHERE id = $1", [shareId]),
      { code: CHECK_VIOLATION, constraint: "shares_capture_only_when_capturing" },
    );
  });

  it("N13. a failed capture's authorization can still be voided", async () => {
    const { contractId, shareIds } = await confirmed(app, user);
    const shareId = shareIds[0] ?? "";
    await hold(app, shareId, 130);
    await app.query("UPDATE contracts SET status = 'capturing', direction = 'keep' WHERE id = $1", [
      contractId,
    ]);
    await app.query("UPDATE shares SET status = 'capture_failed' WHERE id = $1", [shareId]);
    await app.query("UPDATE shares SET status = 'released' WHERE id = $1", [shareId]);
  });

  it("N14. a share insert locks its contract, so a concurrent confirm waits", async () => {
    const contractId = await draft(app, user, { headcount: 2 });
    const inserting = await app.connect();
    const confirming = await app.connect();
    try {
      await inserting.query("BEGIN");
      await addShares(inserting, contractId, ["A"]);
      await confirming.query("BEGIN");
      await confirming.query("SET LOCAL lock_timeout = '300ms'");
      await expectDbError(
        confirming.query(
          "UPDATE contracts SET status = 'active', confirmed_at = now(), demo_now = now() WHERE id = $1",
          [contractId],
        ),
        { code: LOCK_NOT_AVAILABLE },
      );
    } finally {
      await confirming.query("ROLLBACK").catch(() => undefined);
      await inserting.query("ROLLBACK").catch(() => undefined);
      confirming.release();
      inserting.release();
    }
  });
});

describe("paypal_operations", () => {
  it("9. only one mutating call can be in flight per share", async () => {
    const { shareIds } = await confirmed(app, user);
    const shareId = shareIds[0] ?? "";
    await insertOperation(app, shareId, "create_order", "k9a");
    await expectDbError(insertOperation(app, shareId, "create_order", "k9b"), {
      code: UNIQUE_VIOLATION,
      constraint: "ops_one_inflight_per_share",
    });
  });

  it("10. a key has one live row, replay gets 23505, retry after failure is allowed", async () => {
    const { shareIds } = await confirmed(app, user);
    const [first = "", second = ""] = shareIds;
    const op = newId("op");
    await insertOperation(app, first, "create_order", "k10", "pending", op);
    await app.query("UPDATE paypal_operations SET outcome = 'completed' WHERE id = $1", [op]);
    await expectDbError(insertOperation(app, first, "create_order", "k10"), {
      code: UNIQUE_VIOLATION,
      constraint: "ops_one_live_per_key",
    });
    const failed = newId("op");
    await insertOperation(app, second, "create_order", "k10f", "pending", failed);
    await app.query("UPDATE paypal_operations SET outcome = 'failed' WHERE id = $1", [failed]);
    await insertOperation(app, second, "create_order", "k10f");
  });

  it("N7. the log is born pending, moves legally, and settled rows are frozen", async () => {
    const { shareIds } = await confirmed(app, user);
    const shareId = shareIds[0] ?? "";
    const op = newId("op");
    await expectDbError(insertOperation(app, shareId, "create_order", "c7", "completed", op), {
      code: CHECK_VIOLATION,
      constraint: "ops_insert_pending",
    });
    await insertOperation(app, shareId, "create_order", "c7", "pending", op);
    await expectDbError(app.query(`UPDATE paypal_operations SET request = '{"x":1}' WHERE id = $1`, [op]), {
      code: CHECK_VIOLATION,
      constraint: "ops_identity_immutable",
    });
    await app.query("UPDATE paypal_operations SET outcome = 'unknown' WHERE id = $1", [op]);
    await expectDbError(app.query("UPDATE paypal_operations SET outcome = 'pending' WHERE id = $1", [op]), {
      code: CHECK_VIOLATION,
      constraint: "ops_outcome_transition",
    });
    await app.query(
      "UPDATE paypal_operations SET outcome = 'completed', resolved_by_sync = true WHERE id = $1",
      [op],
    );
    await expectDbError(app.query("UPDATE paypal_operations SET outcome = 'failed' WHERE id = $1", [op]), {
      code: CHECK_VIOLATION,
      constraint: "ops_settled_immutable",
    });
    await insertOperation(app, shareId, "get_order", null, "completed"); // reads may be inserted as completed
  });
});

describe("events", () => {
  it("12. are append-only: the trigger stops the owner, the grants stop the app", async () => {
    const contractId = await draft(app, user);
    await app.query(
      "INSERT INTO events (contract_id, type, detail, occurred_at) VALUES ($1, 'rule_extracted', 'x', now())",
      [contractId],
    );
    await expectDbError(owner.query("UPDATE events SET detail = 'y' WHERE contract_id = $1", [contractId]), {
      code: CHECK_VIOLATION,
      constraint: "events_append_only",
    });
    await expectDbError(app.query("UPDATE events SET detail = 'y' WHERE contract_id = $1", [contractId]), {
      code: INSUFFICIENT_PRIVILEGE,
    });
    await expectDbError(app.query("DELETE FROM events WHERE contract_id = $1", [contractId]), {
      code: INSUFFICIENT_PRIVILEGE,
    });
  });

  it("N8. an event's share must belong to the event's contract", async () => {
    const first = await confirmed(app, user);
    const second = await confirmed(app, user);
    await expectDbError(
      app.query(
        "INSERT INTO events (contract_id, share_id, type, detail, occurred_at) VALUES ($1, $2, 'hold_placed', 'x', now())",
        [first.contractId, second.shareIds[0]],
      ),
      { code: FOREIGN_KEY_VIOLATION, constraint: "events_share_fk" },
    );
  });
});

describe("users, cleanup, and ai_usage", () => {
  it("13. deleting a guest as the app role cascades everything and keeps ai_usage", async () => {
    const guestId = await guest(app);
    const { contractId, shareIds } = await confirmed(app, guestId);
    await app.query(
      "INSERT INTO events (contract_id, share_id, type, detail, occurred_at) VALUES ($1, $2, 'order_created', 'x', now())",
      [contractId, shareIds[0]],
    );
    await app.query(
      `INSERT INTO ai_usage (route, provider, model, user_id, contract_id, ip_hash, input_tokens, output_tokens, succeeded)
       VALUES ('extract', 'gemini', 'gemini-flash', $1, $2, 'ih', 1, 1, true)`,
      [guestId, contractId],
    );
    const deleted = await app.query(
      "DELETE FROM users WHERE kind = 'guest' AND expires_at < now() AND id = $1",
      [guestId],
    );
    expect(deleted.rowCount).toBe(1);
    expect(await count(app, "contracts", "owner_id = $1", [guestId])).toBe(0);
    expect(await count(app, "events", "contract_id = $1", [contractId])).toBe(0);
    expect(await count(app, "ai_usage", "contract_id = $1 AND user_id IS NULL", [contractId])).toBe(1);
  });

  it("N6. a guest with a live hold cannot be deleted, and can after the hold is released", async () => {
    const guestId = await guest(app);
    const { contractId, shareIds } = await confirmed(app, guestId);
    const [heldShare = "", otherShare = ""] = shareIds;
    await hold(app, heldShare, 60);
    await expectDbError(app.query("DELETE FROM users WHERE id = $1", [guestId]), {
      code: CHECK_VIOLATION,
      constraint: "shares_live_money_undeletable",
    });
    await app.query("UPDATE contracts SET status = 'releasing', direction = 'release' WHERE id = $1", [
      contractId,
    ]);
    const voidOp = newId("op");
    await insertOperation(app, heldShare, "void", "v6", "pending", voidOp);
    await app.query("UPDATE shares SET status = 'released' WHERE id = $1", [heldShare]);
    await app.query("UPDATE paypal_operations SET outcome = 'completed' WHERE id = $1", [voidOp]);
    await app.query("UPDATE shares SET status = 'expired' WHERE id = $1", [otherShare]);
    await app.query("UPDATE contracts SET status = 'released', resolved_at = now() WHERE id = $1", [
      contractId,
    ]);
    const deleted = await app.query("DELETE FROM users WHERE id = $1", [guestId]);
    expect(deleted.rowCount).toBe(1);
  });

  it("14. ai_usage refuses paid OpenRouter models and defaults the day to UTC", async () => {
    await expectDbError(
      app.query(
        `INSERT INTO ai_usage (route, provider, model, ip_hash, input_tokens, output_tokens, succeeded)
         VALUES ('extract', 'openrouter', 'openai/gpt-5', 'ih', 1, 1, true)`,
      ),
      { code: CHECK_VIOLATION, constraint: "ai_usage_openrouter_free_only" },
    );
    const free = await app.query<{ is_utc_day: boolean }>(
      `INSERT INTO ai_usage (route, provider, model, ip_hash, input_tokens, output_tokens, succeeded)
       VALUES ('extract', 'openrouter', 'x/y:free', 'ih', 1, 1, true)
       RETURNING day = (now() AT TIME ZONE 'UTC')::date AS is_utc_day`,
    );
    expect(free.rows[0]?.is_utc_day).toBe(true);
  });

  it("14b. ai_usage records DeepSeek attempts, and the OpenRouter free-only rule still holds", async () => {
    await app.query(
      `INSERT INTO ai_usage (route, provider, model, ip_hash, input_tokens, output_tokens, succeeded)
       VALUES ('extract', 'deepseek', 'deepseek-flash', 'ih', 1, 1, true)`,
    );
    await expectDbError(
      app.query(
        `INSERT INTO ai_usage (route, provider, model, ip_hash, input_tokens, output_tokens, succeeded)
         VALUES ('extract', 'madeup', 'x', 'ih', 1, 1, true)`,
      ),
      { code: CHECK_VIOLATION, constraint: "ai_usage_provider_valid" },
    );
  });

  it("N11. the app role cannot disable triggers, edit transitions, or delete the operation log", async () => {
    await expectDbError(app.query("ALTER TABLE shares DISABLE TRIGGER shares_guard_trg"), {
      code: INSUFFICIENT_PRIVILEGE,
    });
    await expectDbError(app.query("INSERT INTO share_transitions VALUES ('released', 'kept')"), {
      code: INSUFFICIENT_PRIVILEGE,
    });
    await expectDbError(app.query("DELETE FROM paypal_operations"), { code: INSUFFICIENT_PRIVILEGE });
  });
});
