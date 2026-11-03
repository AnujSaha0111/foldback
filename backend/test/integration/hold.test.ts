import request from "supertest";
import type { Pool } from "pg";
import {
  APPROVE_URL,
  CREATED_ORDER,
  EXPIRES,
  HOLD_ID,
  ORDER_ID,
  PAYPAL_KEYS,
  authorizedOrder,
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

const HELD: PayPalStep = { status: 201, body: authorizedOrder() };
const notApproved: PayPalStep = {
  status: 422,
  body: refusal("UNPROCESSABLE_ENTITY", "ORDER_NOT_APPROVED"),
};
const alreadyDone: PayPalStep = {
  status: 422,
  body: refusal("UNPROCESSABLE_ENTITY", "ORDER_ALREADY_AUTHORIZED"),
};

/** A share with an open order, and the requests that act on it. `steps` follow the order's own create call. */
async function opened(steps: PayPalStep[], env: Record<string, string | undefined> = {}) {
  const harness = setup([CREATED, ...steps], env);
  const { contractId, shareId, second } = await plan();
  await harness.checkout(shareId);
  const authorize = (orderId: string = ORDER_ID) =>
    request(harness.app)
      .post(`/api/shares/${shareId}/authorize`)
      .set("Origin", ORIGIN)
      .send({ order_id: orderId });
  const authorizeCalls = () => harness.paypal.apiCalls().filter((call) => call.url.endsWith("/authorize"));
  const sync = (body: object = {}) =>
    request(harness.app).post(`/api/shares/${shareId}/sync`).set("Origin", ORIGIN).send(body);
  const readCalls = () => harness.paypal.apiCalls().filter((call) => call.method === "GET");
  return { ...harness, contractId, shareId, second, authorize, authorizeCalls, sync, readCalls };
}

async function heldRow(shareId: string) {
  const result = await db.query<{
    status: string;
    authorization_id: string | null;
    authorization_expires_at: Date | null;
  }>("SELECT status, authorization_id, authorization_expires_at FROM shares WHERE id = $1", [shareId]);
  return result.rows[0];
}

describe("authorize", () => {
  it("stores the hold, keeps the plan active and tells the board (test 50)", async () => {
    const { contractId, shareId, notifier, authorize, authorizeCalls } = await opened([HELD]);
    const eventsBefore = notifier.contractEvents.length;

    const res = await authorize();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      outcome: "completed",
      share: { share_id: shareId, status: "held", authorization_id: HOLD_ID, held_count: 1 },
      contract: { id: contractId, status: "active" },
    });

    const [call] = authorizeCalls();
    expect(call?.method).toBe("POST");
    expect(call?.url).toBe(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${ORDER_ID}/authorize`);
    expect(call?.headers["paypal-request-id"]).toBe(`fb-auth-${ORDER_ID}`);

    expect(await heldRow(shareId)).toEqual({
      status: "held",
      authorization_id: HOLD_ID,
      authorization_expires_at: new Date(EXPIRES),
    });
    expect(await eventTypes(contractId)).toContain("hold_placed");
    expect(notifier.contractEvents).toHaveLength(eventsBefore + 1);
    const [first, second] = notifier.contractEvents;
    expect(second?.[1]).toBeGreaterThan(first?.[1] ?? 0);
  });

  it("never returns the buyer's details or the approval link", async () => {
    const { authorize } = await opened([HELD]);
    const text = JSON.stringify((await authorize()).body);
    for (const secret of ["buyer@example.com", "approve_url", "payer", "extraction", "rule_text"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("stores the existing hold on a replay, with one key across calls (test 51)", async () => {
    const { shareId, paypal, authorize, authorizeCalls } = await opened([
      notApproved,
      alreadyDone,
      { body: authorizedOrder() },
    ]);

    expect((await authorize()).status).toBe(502);
    expect(await shareRow(shareId)).toMatchObject({ status: "checkout_open" });

    const res = await authorize();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ outcome: "completed", share: { authorization_id: HOLD_ID } });
    expect(authorizeCalls().map((call) => call.headers["paypal-request-id"])).toEqual([
      `fb-auth-${ORDER_ID}`,
      `fb-auth-${ORDER_ID}`,
    ]);
    expect(paypal.apiCalls().at(-1)?.url).toContain(`/v2/checkout/orders/${ORDER_ID}`);
    expect(paypal.apiCalls().at(-1)?.method).toBe("GET");
    expect((await operations(shareId)).map((op) => [op.kind, op.outcome])).toEqual([
      ["create_order", "completed"],
      ["authorize", "failed"],
      ["authorize", "failed"],
      ["get_order", "completed"],
    ]);
  });

  it("stays unknown when a replay's read shows no usable hold", async () => {
    const { shareId, authorize } = await opened([alreadyDone, { fail: "timeout" }]);

    const res = await authorize();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ outcome: "unknown", share: { authorization_id: null } });
    expect(await shareRow(shareId)).toMatchObject({ status: "authorize_unknown" });
    expect((await operations(shareId)).map((op) => [op.kind, op.outcome])).toEqual([
      ["create_order", "completed"],
      ["authorize", "unknown"],
      ["get_order", "unknown"],
    ]);
  });

  it("returns the same hold for the same return URL, without calling PayPal", async () => {
    const { authorize, authorizeCalls, contractId } = await opened([HELD]);
    await authorize();

    const again = await authorize();
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ outcome: "completed", share: { authorization_id: HOLD_ID } });
    expect(authorizeCalls()).toHaveLength(1);
    expect((await eventTypes(contractId)).filter((type) => type === "hold_placed")).toHaveLength(1);
  });

  it("refuses an order that is not this share's, and calls nothing (test 52)", async () => {
    const { shareId, authorize, authorizeCalls } = await opened([]);

    const res = await authorize("SOMEONEELSESORDER");
    expect(res.status).toBe(400);
    expect(errorOf(res)).toBe("bad_request");
    expect(authorizeCalls()).toHaveLength(0);
    expect(await shareRow(shareId)).toMatchObject({ status: "checkout_open" });
  });

  it("refuses an order on a share that has none", async () => {
    const { app, paypal } = setup();
    const { shareId } = await plan();
    const res = await request(app)
      .post(`/api/shares/${shareId}/authorize`)
      .set("Origin", ORIGIN)
      .send({ order_id: ORDER_ID });
    expect(res.status).toBe(400);
    expect(paypal.calls).toHaveLength(0);
  });

  it("reserves the share when the reply is lost (test 53)", async () => {
    const { contractId, shareId, checkout, authorize, authorizeCalls } = await opened([{ fail: "timeout" }]);

    const lost = await authorize();
    expect(lost.status).toBe(200);
    expect(lost.body).toMatchObject({ outcome: "unknown", share: { status: "authorize_unknown" } });
    expect((await operations(shareId)).at(-1)).toMatchObject({ kind: "authorize", outcome: "unknown" });
    expect(await eventTypes(contractId)).toContain("hold_unknown");

    const next = await checkout(shareId);
    expect(next.status).toBe(409);
    expect(errorOf(next)).toBe("money_unknown");
    expect(errorOf(await authorize())).toBe("money_unknown");
    expect(authorizeCalls()).toHaveLength(1);
  });

  it("is marked unknown before the call, so a crash during it cannot free the share", async () => {
    let during: string | undefined;
    const { authorize } = await opened([
      {
        ...HELD,
        during: async () => {
          const { rows } = await db.query<{ status: string }>(
            "SELECT status FROM shares WHERE order_id = $1",
            [ORDER_ID],
          );
          during = rows[0]?.status;
        },
      },
    ]);

    await authorize();
    expect(during).toBe("authorize_unknown");
  });

  it("sends one authorize when two requests race (test 54)", async () => {
    const slow = () => new Promise<void>((done) => setTimeout(done, 200));
    const { shareId, authorize, authorizeCalls } = await opened([{ ...HELD, during: slow }]);

    const results = await Promise.all([authorize(), authorize()]);
    expect(authorizeCalls()).toHaveLength(1);
    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(["money_unknown", "resolve_in_progress"]).toContain(
      errorOf(results.find((res) => res.status === 409) ?? { body: {} }),
    );
    expect(await shareRow(shareId)).toMatchObject({ status: "held" });
  });

  it("releases the contract lock, so the next friend can confirm", async () => {
    const { authorize, shareId } = await opened([notApproved, HELD]);
    expect((await authorize()).status).toBe(502);
    expect((await authorize()).status).toBe(200);
    expect(await shareRow(shareId)).toMatchObject({ status: "held" });
  });

  it.each(["DENIED", "PENDING"])(
    "refuses a hold PayPal marked %s, and allows a new order",
    async (status) => {
      const { contractId, shareId, checkout, authorize } = await opened([
        { status: 201, body: authorizedOrder(status) },
        SECOND,
      ]);

      const res = await authorize();
      expect(res.status).toBe(502);
      expect(errorOf(res)).toBe("paypal_failed");
      expect((res.body as { message: string }).message).toBe("PayPal did not approve this hold.");
      expect(await heldRow(shareId)).toMatchObject({ status: "declined", authorization_id: null });
      const events = await eventTypes(contractId);
      expect(events).toContain("checkout_declined");
      expect(events).not.toContain("hold_placed");

      expect((await checkout(shareId)).body).toMatchObject({
        order_id: SECOND_ORDER_ID,
        approve_url: SECOND_URL,
      });
      expect(await shareRow(shareId)).toMatchObject({ status: "checkout_open", checkout_attempt: 2 });
    },
  );

  it("lets a friend finish an order on a declined share", async () => {
    const { shareId, authorize } = await opened([HELD]);
    await db.query("UPDATE shares SET status = 'declined' WHERE id = $1", [shareId]);

    expect((await authorize()).status).toBe(200);
    expect(await shareRow(shareId)).toMatchObject({ status: "held" });
  });

  it("refuses after the decision and calls nothing (test 74)", async () => {
    const { contractId, authorize, authorizeCalls } = await opened([]);
    await db.query("UPDATE contracts SET status = 'releasing', direction = 'release' WHERE id = $1", [
      contractId,
    ]);

    const res = await authorize();
    expect(res.status).toBe(409);
    expect(errorOf(res)).toBe("contract_closed");
    expect(authorizeCalls()).toHaveLength(0);
  });

  it("refuses after the deadline, so an approved order is not money", async () => {
    const { contractId, authorize, authorizeCalls } = await opened([]);
    await db.query("UPDATE contracts SET demo_now = deadline_at WHERE id = $1", [contractId]);

    const res = await authorize();
    expect(res.status).toBe(409);
    expect(errorOf(res)).toBe("share_not_payable");
    expect(authorizeCalls()).toHaveLength(0);
  });

  it("refuses a sample share and never calls PayPal", async () => {
    const { app, paypal } = setup();
    const contractId = await seedContract(db, await member(db));
    const sample = await db.query<{ id: string }>("SELECT id FROM shares WHERE contract_id = $1 LIMIT 1", [
      contractId,
    ]);
    const res = await request(app)
      .post(`/api/shares/${sample.rows[0]?.id ?? ""}/authorize`)
      .set("Origin", ORIGIN)
      .send({ order_id: ORDER_ID });
    expect(res.status).toBe(409);
    expect(errorOf(res)).toBe("sample_row");
    expect(paypal.calls).toHaveLength(0);
  });

  it("stays closed with the kill switch, and changes nothing", async () => {
    const { shareId } = await plan();
    const open = setup([CREATED]);
    await open.checkout(shareId);
    const { app, paypal } = setup([], { PAYPAL_WRITES_ENABLED: "false" });

    const res = await request(app)
      .post(`/api/shares/${shareId}/authorize`)
      .set("Origin", ORIGIN)
      .send({ order_id: ORDER_ID });
    expect(res.status).toBe(503);
    expect(errorOf(res)).toBe("paypal_disabled");
    expect(paypal.calls).toHaveLength(0);
    expect(await shareRow(shareId)).toMatchObject({ status: "checkout_open" });
  });

  it("refuses a body with anything else in it", async () => {
    const { app, paypal } = setup();
    const { shareId } = await plan();
    const res = await request(app)
      .post(`/api/shares/${shareId}/authorize`)
      .set("Origin", ORIGIN)
      .send({ order_id: ORDER_ID, amount_cents: 1 });
    expect(res.status).toBe(400);
    expect(paypal.calls).toHaveLength(0);
  });

  it("answers an unknown share the same as any bad link", async () => {
    const { app } = setup();
    const res = await request(app)
      .post(`/api/shares/${newId("shr")}/authorize`)
      .set("Origin", ORIGIN)
      .send({ order_id: ORDER_ID });
    expect(res.status).toBe(404);
  });
});

describe("sync", () => {
  async function resolvedBySync(shareId: string, kind: string) {
    const result = await db.query<{ outcome: string; resolved_by_sync: boolean }>(
      "SELECT outcome, resolved_by_sync FROM paypal_operations WHERE share_id = $1 AND kind = $2",
      [shareId, kind],
    );
    return result.rows;
  }

  it("completes an unknown hold from the order (test 55)", async () => {
    const { contractId, shareId, authorize, sync, readCalls, notifier } = await opened([
      { fail: "timeout" },
      { body: authorizedOrder() },
    ]);
    await authorize();
    const eventsBefore = notifier.contractEvents.length;

    const res = await sync();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      share: { status: "held", held_count: 1 },
      contract: { id: contractId },
    });
    expect(await heldRow(shareId)).toMatchObject({ status: "held", authorization_id: HOLD_ID });
    expect(await resolvedBySync(shareId, "authorize")).toEqual([
      { outcome: "completed", resolved_by_sync: true },
    ]);
    expect(await resolvedBySync(shareId, "get_order")).toEqual([
      { outcome: "completed", resolved_by_sync: false },
    ]);
    expect(readCalls()[0]?.url).toBe(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${ORDER_ID}`);
    expect(await eventTypes(contractId)).toContain("hold_placed");
    expect(notifier.contractEvents).toHaveLength(eventsBefore + 1);
  });

  it("reopens the checkout when the order was approved but never authorized, and authorize then works", async () => {
    const { shareId, authorize, sync } = await opened([
      { fail: "timeout" },
      { body: { id: ORDER_ID, status: "APPROVED" } },
      { status: 201, body: authorizedOrder() },
    ]);
    await authorize();

    await sync();
    expect(await shareRow(shareId)).toMatchObject({ status: "checkout_open" });
    expect(await resolvedBySync(shareId, "authorize")).toEqual([
      { outcome: "failed", resolved_by_sync: true },
    ]);
    expect((await authorize()).body).toMatchObject({ outcome: "completed", share: { status: "held" } });
  });

  it("declines a share whose authorization PayPal voided", async () => {
    const { shareId, authorize, sync } = await opened([
      { fail: "timeout" },
      { body: authorizedOrder("VOIDED") },
    ]);
    await authorize();
    await sync();
    expect(await shareRow(shareId)).toMatchObject({ status: "declined" });
  });

  it("stays unknown when PayPal cannot be read", async () => {
    const { shareId, authorize, sync } = await opened([{ fail: "timeout" }, { fail: "timeout" }]);
    await authorize();

    const res = await sync();
    expect(res.status).toBe(200);
    expect(await shareRow(shareId)).toMatchObject({ status: "authorize_unknown" });
    expect(await resolvedBySync(shareId, "authorize")).toEqual([
      { outcome: "unknown", resolved_by_sync: false },
    ]);
  });

  it("declines a cancelled checkout, and the retry gets a new key (test 56)", async () => {
    const { contractId, shareId, sync, checkout, paypal } = await opened([{ body: CREATED_ORDER }, SECOND]);

    const res = await sync({ buyer_cancelled: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ share: { status: "declined" } });
    expect(await eventTypes(contractId)).toContain("checkout_declined");

    expect((await checkout(shareId)).body).toMatchObject({ order_id: SECOND_ORDER_ID });
    const keys = paypal
      .apiCalls()
      .map((call) => call.headers["paypal-request-id"])
      .filter(Boolean);
    expect(keys).toEqual([`fb-order-${shareId}-1`, `fb-order-${shareId}-2`]);
  });

  it("declines a cancelled checkout whose order PayPal no longer has", async () => {
    const { shareId, sync } = await opened([
      { status: 404, body: refusal("RESOURCE_NOT_FOUND", "INVALID_RESOURCE_ID") },
    ]);
    await sync({ buyer_cancelled: true });
    expect(await shareRow(shareId)).toMatchObject({ status: "declined" });
  });

  it("keeps an approved order open on a cancel, so the friend can still finish it", async () => {
    const { shareId, sync } = await opened([{ body: { id: ORDER_ID, status: "APPROVED" } }]);
    await sync({ buyer_cancelled: true });
    expect(await shareRow(shareId)).toMatchObject({ status: "checkout_open", order_id: ORDER_ID });
  });

  it("leaves a held share alone on a cancel, and asks PayPal nothing", async () => {
    const { authorize, sync, readCalls } = await opened([{ status: 201, body: authorizedOrder() }]);
    await authorize();

    const res = await sync({ buyer_cancelled: true });
    expect(res.body).toMatchObject({ share: { status: "held" } });
    expect(readCalls()).toHaveLength(0);
  });

  it("frees a lost create without asking PayPal", async () => {
    const harness = setup([{ fail: "timeout" }]);
    const { shareId } = await plan();
    await harness.checkout(shareId);

    const res = await request(harness.app).post(`/api/shares/${shareId}/sync`).set("Origin", ORIGIN).send({});
    expect(res.body).toMatchObject({ share: { status: "waiting" } });
    expect(await resolvedBySync(shareId, "create_order")).toEqual([
      { outcome: "failed", resolved_by_sync: true },
    ]);
    expect(harness.paypal.apiCalls()).toHaveLength(1);
  });

  it("leaves a create that is still running alone", async () => {
    const { shareId } = await plan();
    let during: { status: number; body: unknown } | undefined;
    const harness = setup([
      {
        ...CREATED,
        during: async () => {
          const res = await request(harness.app)
            .post(`/api/shares/${shareId}/sync`)
            .set("Origin", ORIGIN)
            .send({});
          during = { status: res.status, body: res.body };
        },
      },
    ]);

    expect((await harness.checkout(shareId)).body).toMatchObject({ order_id: ORDER_ID });
    expect(during).toMatchObject({ status: 200, body: { share: { status: "checkout_open" } } });
    expect(await shareRow(shareId)).toMatchObject({ status: "checkout_open", order_id: ORDER_ID });
    expect(await resolvedBySync(shareId, "create_order")).toEqual([
      { outcome: "completed", resolved_by_sync: false },
    ]);
  });

  it("does nothing on a sample share", async () => {
    const { app, paypal } = setup();
    const contractId = await seedContract(db, await member(db));
    const sample = await db.query<{ id: string }>("SELECT id FROM shares WHERE contract_id = $1 LIMIT 1", [
      contractId,
    ]);
    const res = await request(app)
      .post(`/api/shares/${sample.rows[0]?.id ?? ""}/sync`)
      .set("Origin", ORIGIN)
      .send({ buyer_cancelled: true });
    expect(res.status).toBe(200);
    expect(paypal.calls).toHaveLength(0);
  });

  it("refuses any other body", async () => {
    const { app } = setup();
    const { shareId } = await plan();
    const res = await request(app)
      .post(`/api/shares/${shareId}/sync`)
      .set("Origin", ORIGIN)
      .send({ buyer_cancelled: false });
    expect(res.status).toBe(400);
  });
});
