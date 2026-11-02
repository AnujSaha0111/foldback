import request from "supertest";
import type { Pool } from "pg";
import {
  APPROVE_URL,
  CREATED_ORDER,
  ORDER_ID,
  PAYPAL_KEYS,
  refusal,
  scriptedPayPal,
} from "../fixtures/paypal";
import type { PayPalStep } from "../fixtures/paypal";
import { ORIGIN, buildApp, recordingNotifier } from "../helpers/app";
import {
  confirmed,
  createPools,
  hold,
  member,
  newId,
  prepareDatabase,
  seedContract,
  truncateAll,
} from "../helpers/db";
import type { Pools } from "../helpers/db";

let pools: Pools;
let db: Pool;

beforeAll(async () => {
  pools = createPools();
  db = pools.app;
  await prepareDatabase(pools.owner);
});

beforeEach(async () => {
  await truncateAll(pools.owner);
});

afterAll(async () => {
  await pools.app.end();
  await pools.owner.end();
});

const CREATED: PayPalStep = { status: 201, body: CREATED_ORDER };
const SECOND_ORDER_ID = "TESTORDER0000002";
const SECOND_URL = `https://www.sandbox.paypal.com/checkoutnow?token=${SECOND_ORDER_ID}`;
const SECOND: PayPalStep = {
  status: 201,
  body: {
    ...CREATED_ORDER,
    id: SECOND_ORDER_ID,
    links: [{ rel: "payer-action", href: SECOND_URL }],
  },
};

function setup(steps: PayPalStep[] = [], env: Record<string, string | undefined> = {}) {
  const paypal = scriptedPayPal(steps);
  const notifier = recordingNotifier();
  const app = buildApp(pools, { env: { ...PAYPAL_KEYS, ...env }, paypalFetch: paypal.fetch, notifier });
  const checkout = (shareId: string) =>
    request(app).post(`/api/shares/${shareId}/checkout`).set("Origin", ORIGIN).send({});
  return { app, paypal, notifier, checkout };
}

async function plan(names: string[] = ["A", "B"], grace: string | null = null) {
  const { contractId, shareIds } = await confirmed(db, await member(db), names, grace);
  return { contractId, shareId: shareIds[0] ?? "", second: shareIds[1] ?? "" };
}

async function shareRow(shareId: string) {
  const result = await db.query<{
    status: string;
    checkout_attempt: number;
    order_id: string | null;
    approve_url: string | null;
  }>("SELECT status, checkout_attempt, order_id, approve_url FROM shares WHERE id = $1", [shareId]);
  return result.rows[0];
}

async function operations(shareId: string) {
  const result = await db.query<{ kind: string; outcome: string; idempotency_key: string }>(
    "SELECT kind, outcome, idempotency_key FROM paypal_operations WHERE share_id = $1 ORDER BY created_at",
    [shareId],
  );
  return result.rows;
}

async function eventTypes(contractId: string) {
  const result = await db.query<{ type: string }>("SELECT type FROM events WHERE contract_id = $1", [
    contractId,
  ]);
  return result.rows.map((row) => row.type);
}

const errorOf = (res: { body: unknown }) => (res.body as { error: string }).error;

describe("checkout", () => {
  it("refuses a sample share and never calls PayPal (test 47)", async () => {
    const { paypal, checkout } = setup();
    const contractId = await seedContract(db, await member(db));
    const sample = await db.query<{ id: string }>("SELECT id FROM shares WHERE contract_id = $1 LIMIT 1", [
      contractId,
    ]);

    const res = await checkout(sample.rows[0]?.id ?? "");
    expect(res.status).toBe(409);
    expect(errorOf(res)).toBe("sample_row");
    expect(paypal.calls).toHaveLength(0);
  });

  it("creates an AUTHORIZE order and stores it (test 48)", async () => {
    const { paypal, checkout } = setup([CREATED]);
    const { contractId, shareId } = await plan();

    const res = await checkout(shareId);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ outcome: "completed", order_id: ORDER_ID, approve_url: APPROVE_URL });

    const [call] = paypal.apiCalls();
    expect(paypal.apiCalls()).toHaveLength(1);
    expect(call?.url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders");
    expect(call?.method).toBe("POST");
    expect(call?.headers["paypal-request-id"]).toBe(`fb-order-${shareId}-1`);
    expect(JSON.parse(call?.body ?? "")).toMatchObject({
      intent: "AUTHORIZE",
      purchase_units: [{ reference_id: shareId, amount: { currency_code: "USD", value: "80.00" } }],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: `http://localhost:3000/pay/${shareId}`,
            cancel_url: `http://localhost:3000/pay/${shareId}?cancelled=1`,
          },
        },
      },
    });

    expect(await shareRow(shareId)).toEqual({
      status: "checkout_open",
      checkout_attempt: 1,
      order_id: ORDER_ID,
      approve_url: APPROVE_URL,
    });
    expect(await operations(shareId)).toEqual([
      { kind: "create_order", outcome: "completed", idempotency_key: `fb-order-${shareId}-1` },
    ]);
    expect(await eventTypes(contractId)).toContain("order_created");
  });

  it("tells the board with a higher version, so the event is not ignored", async () => {
    const { notifier, checkout } = setup([CREATED]);
    const { contractId, shareId } = await plan();
    const before = await db.query<{ version: number }>("SELECT version FROM contracts WHERE id = $1", [
      contractId,
    ]);

    await checkout(shareId);
    const [event] = notifier.contractEvents;
    expect(event?.[0]).toBe(contractId);
    expect(event?.[1]).toBeGreaterThan(before.rows[0]?.version ?? 0);
  });

  it("reuses the open checkout instead of creating a second order (test 49)", async () => {
    const { paypal, checkout } = setup([CREATED]);
    const { shareId } = await plan();

    const first = await checkout(shareId);
    const second = await checkout(shareId);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(paypal.apiCalls()).toHaveLength(1);
    expect(await shareRow(shareId)).toMatchObject({ checkout_attempt: 1 });
  });

  it("sends one order when two requests race", async () => {
    const { paypal, checkout } = setup([CREATED]);
    const { shareId } = await plan();

    const results = await Promise.all([checkout(shareId), checkout(shareId)]);
    expect(paypal.apiCalls()).toHaveLength(1);
    expect(results.map((res) => res.status).sort()).toEqual(expect.arrayContaining([200]));
    expect(await shareRow(shareId)).toMatchObject({ checkout_attempt: 1, order_id: ORDER_ID });
  });

  it("refuses a body, so the browser can never send an amount", async () => {
    const { app, paypal } = setup();
    const { shareId } = await plan();
    const res = await request(app)
      .post(`/api/shares/${shareId}/checkout`)
      .set("Origin", ORIGIN)
      .send({ amount_cents: 1 });
    expect(res.status).toBe(400);
    expect(paypal.calls).toHaveLength(0);
  });

  it("frees the share after a definite refusal, and the next attempt gets a new key", async () => {
    const { paypal, checkout } = setup([
      { status: 422, body: refusal("UNPROCESSABLE_ENTITY", "BAD") },
      CREATED,
    ]);
    const { shareId } = await plan();

    const refused = await checkout(shareId);
    expect(refused.status).toBe(502);
    expect(errorOf(refused)).toBe("paypal_failed");
    expect(await shareRow(shareId)).toMatchObject({ status: "waiting", order_id: null });

    expect((await checkout(shareId)).status).toBe(200);
    expect(paypal.apiCalls().map((call) => call.headers["paypal-request-id"])).toEqual([
      `fb-order-${shareId}-1`,
      `fb-order-${shareId}-2`,
    ]);
    expect((await operations(shareId)).map((op) => op.outcome)).toEqual(["failed", "completed"]);
  });

  it("reserves the share when the reply is lost, and makes no second call", async () => {
    const { paypal, checkout } = setup([{ fail: "timeout" }]);
    const { shareId } = await plan();

    const lost = await checkout(shareId);
    expect(lost.status).toBe(200);
    expect(lost.body).toEqual({ outcome: "unknown", order_id: null, approve_url: null });
    expect(await shareRow(shareId)).toMatchObject({ status: "checkout_open", order_id: null });
    expect((await operations(shareId)).map((op) => op.outcome)).toEqual(["unknown"]);

    const next = await checkout(shareId);
    expect(next.status).toBe(409);
    expect(errorOf(next)).toBe("money_unknown");
    expect(paypal.apiCalls()).toHaveLength(1);
  });

  it("drops a cancelled order, so a retry can never hand out its dead link", async () => {
    const { checkout } = setup([CREATED, { fail: "timeout" }, CREATED]);
    const { shareId } = await plan();
    await checkout(shareId);
    await db.query("UPDATE shares SET status = 'declined' WHERE id = $1", [shareId]);

    expect((await checkout(shareId)).body).toMatchObject({ outcome: "unknown" });
    expect(await shareRow(shareId)).toMatchObject({
      status: "checkout_open",
      checkout_attempt: 2,
      order_id: null,
      approve_url: null,
    });
    expect(errorOf(await checkout(shareId))).toBe("money_unknown");
  });

  it("gives a retry after a cancel its own order", async () => {
    const { checkout } = setup([CREATED, SECOND]);
    const { shareId } = await plan();
    await checkout(shareId);
    await db.query("UPDATE shares SET status = 'declined' WHERE id = $1", [shareId]);

    expect((await checkout(shareId)).body).toMatchObject({
      order_id: SECOND_ORDER_ID,
      approve_url: SECOND_URL,
    });
  });

  it("stops at the attempt limit the table allows", async () => {
    const { paypal, checkout } = setup();
    const { shareId } = await plan();
    await db.query("UPDATE shares SET checkout_attempt = 20 WHERE id = $1", [shareId]);

    const res = await checkout(shareId);
    expect(res.status).toBe(409);
    expect(errorOf(res)).toBe("share_not_payable");
    expect(paypal.calls).toHaveLength(0);
  });

  it("refuses a share that is already held", async () => {
    const { paypal, checkout } = setup();
    const { shareId } = await plan();
    await hold(db, shareId, 1);

    const res = await checkout(shareId);
    expect(res.status).toBe(409);
    expect(errorOf(res)).toBe("share_already_held");
    expect(paypal.calls).toHaveLength(0);
  });

  it("refuses after the deadline, by the demo clock", async () => {
    const { paypal, checkout } = setup();
    const { contractId, shareId } = await plan();
    await db.query("UPDATE contracts SET demo_now = deadline_at WHERE id = $1", [contractId]);

    const res = await checkout(shareId);
    expect(res.status).toBe(409);
    expect(errorOf(res)).toBe("share_not_payable");
    expect(paypal.calls).toHaveLength(0);
  });

  it("in grace, refuses everyone but the grace person (test 73)", async () => {
    const { paypal, checkout } = setup([CREATED]);
    const { contractId, shareId, second } = await plan(["A", "B"], "B");
    await db.query(
      "UPDATE contracts SET status = 'grace', demo_now = deadline_at + interval '1 minute' WHERE id = $1",
      [contractId],
    );

    const other = await checkout(shareId);
    expect(other.status).toBe(409);
    expect(errorOf(other)).toBe("share_not_payable");
    expect(paypal.calls).toHaveLength(0);

    expect((await checkout(second)).status).toBe(200);
  });

  it("refuses once the plan is decided", async () => {
    const { paypal, checkout } = setup();
    const { contractId, shareId } = await plan();
    await db.query("UPDATE contracts SET status = 'releasing', direction = 'release' WHERE id = $1", [
      contractId,
    ]);

    const res = await checkout(shareId);
    expect(res.status).toBe(409);
    expect(errorOf(res)).toBe("contract_closed");
    expect(paypal.calls).toHaveLength(0);
  });

  it("answers an unknown share the same as any bad link", async () => {
    const { paypal, checkout } = setup();
    expect((await checkout(newId("shr"))).status).toBe(404);
    expect((await checkout("nope")).status).toBe(404);
    expect(paypal.calls).toHaveLength(0);
  });

  it("needs an allowed Origin, like every mutation", async () => {
    const { app, paypal } = setup();
    const { shareId } = await plan();
    const res = await request(app).post(`/api/shares/${shareId}/checkout`).send({});
    expect(res.status).toBe(403);
    expect(paypal.calls).toHaveLength(0);
  });

  it.each([
    ["the kill switch", { PAYPAL_WRITES_ENABLED: "false" }],
    ["no keys", { PAYPAL_CLIENT_ID: undefined }],
  ])("stays closed with %s, and changes nothing", async (_name, env) => {
    const { paypal, checkout } = setup([], env);
    const { shareId } = await plan();

    const res = await checkout(shareId);
    expect(res.status).toBe(503);
    expect(errorOf(res)).toBe("paypal_disabled");
    expect(paypal.calls).toHaveLength(0);
    expect(await shareRow(shareId)).toMatchObject({ status: "waiting", checkout_attempt: 0 });
    expect(await operations(shareId)).toEqual([]);
  });

  it("answers 404, not 500, when a reset deletes the plan during the call", async () => {
    const { contractId, shareId } = await plan();
    const deletePlan = async () => {
      await db.query("DELETE FROM contracts WHERE id = $1", [contractId]);
    };
    const { notifier, checkout } = setup([{ ...CREATED, during: deletePlan }]);

    const res = await checkout(shareId);
    expect(res.status).toBe(404);
    expect((res.body as { message: string }).message).toBe("That pay link does not exist.");
    expect(notifier.contractEvents).toEqual([]);
  });

  it("does not hand out a stored link while the kill switch is on", async () => {
    const open = setup([CREATED]);
    const { shareId } = await plan();
    await open.checkout(shareId);

    const res = await setup([], { PAYPAL_WRITES_ENABLED: "false" }).checkout(shareId);
    expect(res.status).toBe(503);
    expect(errorOf(res)).toBe("paypal_disabled");
  });
});
