import { PassThrough } from "node:stream";
import request from "supertest";
import { createLogger } from "../../src/observability/logger";
import { purgeOldAiUsage, sweepExpiredGuests } from "../../src/services/housekeeping.service";
import { ORIGIN, buildApp, sessionCookie } from "../helpers/app";
import {
  confirmed,
  count,
  createPools,
  hold,
  insertOperation,
  newId,
  prepareDatabase,
  truncateAll,
} from "../helpers/db";
import type { Pools } from "../helpers/db";

let pools: Pools;

beforeAll(async () => {
  pools = createPools();
  await prepareDatabase(pools.owner);
});

beforeEach(async () => {
  await truncateAll(pools.owner);
});

afterAll(async () => {
  await pools.app.end();
  await pools.owner.end();
});

interface Session {
  id: string;
  cookie: string;
}

async function newGuest(app: ReturnType<typeof buildApp>): Promise<Session> {
  const res = await request(app).post("/api/auth/guest").set("Origin", ORIGIN).send({});
  return { id: (res.body as { user: { id: string } }).user.id, cookie: sessionCookie(res) };
}

function reset(app: ReturnType<typeof buildApp>, session?: Session): request.Test {
  const req = request(app).post("/api/demo/reset").set("Origin", ORIGIN);
  return (session ? req.set("Cookie", session.cookie) : req).send({});
}

async function contractIds(ownerId: string): Promise<string[]> {
  const res = await pools.owner.query<{ id: string }>(
    "SELECT id FROM contracts WHERE owner_id = $1 ORDER BY id",
    [ownerId],
  );
  return res.rows.map((r) => r.id);
}

describe("seed shape (test 23)", () => {
  it("builds the cabin and the print run exactly as data-model.md says", async () => {
    const { id } = await newGuest(buildApp(pools));
    const contracts = await pools.owner.query(
      `SELECT seed_key, title, status, money_source, total_cents, share_cents, headcount, timezone,
              deadline_at, grace_person_name, grace_until, demo_now, reference_at, confirmed_at, direction
         FROM contracts WHERE owner_id = $1 ORDER BY seed_key`,
      [id],
    );
    const [cabin, print] = contracts.rows as Array<Record<string, unknown>>;
    expect(cabin).toMatchObject({
      seed_key: "cabin-hold",
      title: "Cabin weekend",
      status: "active",
      money_source: "sample",
      total_cents: 32000,
      share_cents: 8000,
      headcount: 4,
      timezone: "America/Los_Angeles",
      grace_person_name: "Maya Shah",
      direction: null,
    });
    expect((cabin?.["deadline_at"] as Date).toISOString()).toBe("2026-11-07T02:00:00.000Z");
    expect((cabin?.["grace_until"] as Date).toISOString()).toBe("2026-11-10T02:00:00.000Z");
    expect((cabin?.["demo_now"] as Date).toISOString()).toBe("2026-11-07T00:00:00.000Z");
    expect((cabin?.["reference_at"] as Date).toISOString()).toBe("2026-11-01T20:00:00.000Z");
    expect(print).toMatchObject({
      seed_key: "print-full",
      title: "Print run",
      total_cents: 20000,
      share_cents: 5000,
      grace_person_name: null,
    });

    const cabinShares = await pools.owner.query(
      `SELECT s.display_name, s.status, s.is_grace_subject, s.amount_cents, s.money_source, s.sample_label
         FROM shares s JOIN contracts c ON c.id = s.contract_id
        WHERE c.owner_id = $1 AND c.seed_key = 'cabin-hold' ORDER BY s.position`,
      [id],
    );
    expect(
      cabinShares.rows.map((r: { display_name: string; status: string; is_grace_subject: boolean }) => [
        r.display_name,
        r.status,
        r.is_grace_subject,
      ]),
    ).toEqual([
      ["Alex Chen", "held", false],
      ["Sam Ortiz", "held", false],
      ["Jordan Lee", "held", false],
      ["Maya Shah", "waiting", true],
    ]);
    expect(
      cabinShares.rows.every(
        (r: { amount_cents: number; money_source: string }) =>
          r.amount_cents === 8000 && r.money_source === "sample",
      ),
    ).toBe(true);

    const printShares = await pools.owner.query(
      `SELECT s.display_name, s.status, s.amount_cents FROM shares s JOIN contracts c ON c.id = s.contract_id
        WHERE c.owner_id = $1 AND c.seed_key = 'print-full' ORDER BY s.position`,
      [id],
    );
    expect(
      printShares.rows.map((r: { display_name: string; status: string }) => [r.display_name, r.status]),
    ).toEqual([
      ["Priya Nair", "held"],
      ["Noah Brooks", "held"],
      ["Elena Vaz", "held"],
      ["Chris Dalton", "held"],
    ]);
    expect(printShares.rows.every((r: { amount_cents: number }) => r.amount_cents === 5000)).toBe(true);
  });

  it("gives every sample row the sample label and no PayPal ids or operations (test 24)", async () => {
    const { id } = await newGuest(buildApp(pools));
    const rows = await pools.owner.query(
      `SELECT s.sample_label, s.order_id, s.authorization_id, s.capture_id, s.approve_url
         FROM shares s JOIN contracts c ON c.id = s.contract_id WHERE c.owner_id = $1`,
      [id],
    );
    expect(rows.rowCount).toBe(8);
    for (const r of rows.rows as Array<Record<string, unknown>>) {
      expect(r["sample_label"]).toBe("Sample — no PayPal hold");
      expect([r["order_id"], r["authorization_id"], r["capture_id"], r["approve_url"]]).toEqual([
        null,
        null,
        null,
        null,
      ]);
    }
    expect(await count(pools.owner, "paypal_operations")).toBe(0);
  });
});

describe("reset (test 22)", () => {
  it("needs a signed-in user and an allowed origin", async () => {
    const app = buildApp(pools);
    expect((await reset(app)).status).toBe(401);
    const session = await newGuest(app);
    const noOrigin = await request(app).post("/api/demo/reset").set("Cookie", session.cookie).send({});
    expect(noOrigin.status).toBe(403);
  });

  it("resets only the caller: A gets fresh sample plans, B is untouched", async () => {
    const app = buildApp(pools);
    const a = await newGuest(app);
    const b = await newGuest(app);
    const aBefore = await contractIds(a.id);
    const bBefore = await contractIds(b.id);

    const res = await reset(app, a);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, contracts: ["cabin-hold", "print-full"] });
    expect((res.body as { warning: string }).warning).toContain("stay there until they are voided or expire");

    const aAfter = await contractIds(a.id);
    expect(aAfter).toHaveLength(2);
    expect(aAfter.some((id) => aBefore.includes(id))).toBe(false);
    expect(await contractIds(b.id)).toEqual(bBefore);
    expect(await count(pools.owner, "contracts")).toBe(4);
  });

  it("leaves ai_usage alone", async () => {
    const app = buildApp(pools);
    const a = await newGuest(app);
    await pools.owner.query(
      `INSERT INTO ai_usage (route, provider, model, user_id, ip_hash, input_tokens, output_tokens, succeeded)
       VALUES ('extract', 'groq', 'm', $1, 'h', 1, 1, true)`,
      [a.id],
    );
    await reset(app, a);
    expect(await count(pools.owner, "ai_usage")).toBe(1);
  });

  it("returns 409 live_money and changes nothing when a sandbox share holds money", async () => {
    const app = buildApp(pools);
    const a = await newGuest(app);
    const { shareIds } = await confirmed(pools.app, a.id, ["P", "Q"]);
    await hold(pools.app, shareIds[0] ?? "", 1);
    const before = await contractIds(a.id);

    const res = await reset(app, a);
    expect(res.status).toBe(409);
    expect((res.body as { error: string }).error).toBe("live_money");
    expect((res.body as { message: string }).message).toBe("Release or void your live holds first.");
    expect(await contractIds(a.id)).toEqual(before);
  });
});

describe("concurrent resets", () => {
  it("serialize per user: four at once all succeed and leave exactly two sample plans", async () => {
    const app = buildApp(pools);
    const a = await newGuest(app);
    const results = await Promise.all([reset(app, a), reset(app, a), reset(app, a), reset(app, a)]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200]);
    expect(await contractIds(a.id)).toHaveLength(2);
  });
});

describe("guest sweep", () => {
  it("skips a guest whose authorize call is still in flight, and still removes the others", async () => {
    const logger = createLogger({ level: "error", json: true, stream: new PassThrough() });
    const app = buildApp(pools);
    const inFlight = await newGuest(app);
    const expiredEmpty = await newGuest(app);
    const { shareIds } = await confirmed(pools.app, inFlight.id, ["P", "Q"]);
    const shareId = shareIds[0] ?? "";
    // The first half of a hold: order created, then an authorize call pending (share stays checkout_open).
    const createOp = newId("op");
    await insertOperation(pools.app, shareId, "create_order", `co:${shareId}:1`, "pending", createOp);
    await pools.app.query(
      "UPDATE shares SET status = 'checkout_open', checkout_attempt = 1, order_id = 'ORDX', approve_url = 'https://www.sandbox.paypal.com/x' WHERE id = $1",
      [shareId],
    );
    await pools.app.query(
      "UPDATE paypal_operations SET outcome = 'completed', response = '{}' WHERE id = $1",
      [createOp],
    );
    await insertOperation(pools.app, shareId, "authorize", `au:${shareId}`, "pending");
    await pools.owner.query("UPDATE users SET expires_at = now() - interval '1 day' WHERE id = ANY($1)", [
      [inFlight.id, expiredEmpty.id],
    ]);

    await expect(sweepExpiredGuests(pools.app, logger)).resolves.toBe(1);
    expect(await count(pools.owner, "users", "id = $1", [inFlight.id])).toBe(1);
    expect(await count(pools.owner, "users", "id = $1", [expiredEmpty.id])).toBe(0);
  });

  it("removes expired guests, skips those holding live money, and keeps current guests", async () => {
    const logger = createLogger({ level: "error", json: true, stream: new PassThrough() });
    const app = buildApp(pools);

    const current = await newGuest(app);
    const expiredEmpty = await newGuest(app);
    const expiredHolding = await newGuest(app);
    const { shareIds } = await confirmed(pools.app, expiredHolding.id, ["P", "Q"]);
    await hold(pools.app, shareIds[0] ?? "", 2);
    await pools.owner.query("UPDATE users SET expires_at = now() - interval '1 day' WHERE id = ANY($1)", [
      [expiredEmpty.id, expiredHolding.id],
    ]);

    expect(await sweepExpiredGuests(pools.app, logger)).toBe(1);
    expect(await count(pools.owner, "users", "id = $1", [current.id])).toBe(1);
    expect(await count(pools.owner, "users", "id = $1", [expiredEmpty.id])).toBe(0);
    expect(await count(pools.owner, "contracts", "owner_id = $1", [expiredEmpty.id])).toBe(0);
    expect(await count(pools.owner, "users", "id = $1", [expiredHolding.id])).toBe(1);
  });
});

describe("ai_usage housekeeping", () => {
  it("deletes rows older than 90 days as the owner, and the app role cannot", async () => {
    const insert = (age: string): Promise<unknown> =>
      pools.owner.query(
        `INSERT INTO ai_usage (route, provider, model, ip_hash, input_tokens, output_tokens, succeeded, created_at)
         VALUES ('extract', 'groq', 'm', 'h', 1, 1, true, now() - $1::interval)`,
        [age],
      );
    await insert("91 days");
    await insert("10 days");
    await expect(pools.app.query("DELETE FROM ai_usage")).rejects.toMatchObject({ code: "42501" });
    expect(await purgeOldAiUsage(pools.owner)).toBe(1);
    expect(await count(pools.owner, "ai_usage")).toBe(1);
  });
});
