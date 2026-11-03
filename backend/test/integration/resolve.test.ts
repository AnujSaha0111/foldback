import request from "supertest";
import type { Pool } from "pg";
import type { ContractRead, ContractSummary } from "../../src/shared/api-types";
import {
  CREATED_ORDER,
  HOLD_ID,
  ORDER_ID,
  PAYPAL_KEYS,
  VOIDED_STEP,
  authorizedOrder,
  refusal,
  scriptedPayPal,
} from "../fixtures/paypal";
import type { PayPalStep } from "../fixtures/paypal";
import { ORIGIN, buildApp, recordingNotifier, sessionCookie } from "../helpers/app";
import { confirmed, createPools, hold, insertOperation, prepareDatabase, truncateAll } from "../helpers/db";
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

const capture = (n: number): PayPalStep => ({
  status: 201,
  body: { id: `TESTCAPTURE0000${n}`, status: "COMPLETED" },
});

interface Plan {
  contractId: string;
  shareIds: string[];
  deadline: Date;
  graceUntil: Date | null;
}

/**
 * A guest's sandbox plan of four, A to D, with D as the grace person unless `grace` is null. The first `held` shares
 * hold through the real operation protocol, with authorization ids AUTH1, AUTH2 and so on.
 */
async function setup(
  steps: PayPalStep[],
  options: { held?: number; grace?: string | null; token?: PayPalStep; env?: Record<string, string> } = {},
) {
  const paypal = scriptedPayPal(steps, options.token);
  const notifier = recordingNotifier();
  const app = buildApp(pools, {
    env: { ...PAYPAL_KEYS, ...options.env },
    paypalFetch: paypal.fetch,
    notifier,
  });
  const guest = await request(app).post("/api/auth/guest").set("Origin", ORIGIN).send({});
  const cookie = sessionCookie(guest);
  const ownerId = (guest.body as { user: { id: string } }).user.id;

  const grace = options.grace === undefined ? "D" : options.grace;
  const { contractId, shareIds } = await confirmed(db, ownerId, ["A", "B", "C", "D"], grace);
  for (const [i, shareId] of shareIds.slice(0, options.held ?? 3).entries()) await hold(db, shareId, i + 1);
  const times = await db.query<{ deadline_at: Date; grace_until: Date | null }>(
    "SELECT deadline_at, grace_until FROM contracts WHERE id = $1",
    [contractId],
  );
  const plan: Plan = {
    contractId,
    shareIds,
    deadline: times.rows[0]?.deadline_at ?? new Date(),
    graceUntil: times.rows[0]?.grace_until ?? null,
  };

  const post = (path: string, body: object = {}) =>
    request(app).post(path).set("Origin", ORIGIN).set("Cookie", cookie).send(body);
  return {
    app,
    paypal,
    notifier,
    cookie,
    plan,
    resolve: () => post(`/api/contracts/${contractId}/resolve`),
    clock: (to: Date) => post(`/api/contracts/${contractId}/clock`, { demo_now: to.toISOString() }),
    sync: (shareId: string) =>
      request(app).post(`/api/shares/${shareId}/sync`).set("Origin", ORIGIN).send({}),
    calls: (verb: "capture" | "void") => paypal.apiCalls().filter((call) => call.url.endsWith(`/${verb}`)),
  };
}

async function state(contractId: string) {
  const contract = await db.query<{
    status: string;
    direction: string | null;
    resolution_reason: string | null;
  }>("SELECT status, direction, resolution_reason FROM contracts WHERE id = $1", [contractId]);
  const shares = await db.query<{ display_name: string; status: string; capture_id: string | null }>(
    "SELECT display_name, status, capture_id FROM shares WHERE contract_id = $1 ORDER BY position",
    [contractId],
  );
  return {
    ...contract.rows[0],
    shares: Object.fromEntries(shares.rows.map((row) => [row.display_name, row.status])),
    captures: shares.rows.map((row) => row.capture_id),
  };
}

const errorOf = (res: { body: unknown }) => (res.body as { error: string }).error;
const later = (date: Date, minutes = 1) => new Date(date.getTime() + minutes * 60_000);

describe("resolve before and at the deadline", () => {
  it("stays active before the deadline when someone is missing, and calls nothing (test 59)", async () => {
    const { resolve, paypal, plan } = await setup([]);
    const res = await resolve();
    expect(res.status).toBe(200);
    expect((res.body as ContractRead).contract.status).toBe("active");
    expect(paypal.calls).toHaveLength(0);
    expect(await state(plan.contractId)).toMatchObject({ status: "active", direction: null });
  });

  it("enters grace at the deadline with only the grace person missing (test 60)", async () => {
    const { clock, paypal, plan } = await setup([]);
    const res = await clock(plan.deadline);
    expect(res.status).toBe(200);
    expect(await state(plan.contractId)).toMatchObject({
      status: "grace",
      direction: null,
      shares: { A: "held", B: "held", C: "held", D: "waiting" },
    });
    expect(paypal.calls).toHaveLength(0);
    const pay = await request(buildApp(pools)).get(`/api/shares/${plan.shareIds[3] ?? ""}`);
    expect(pay.body).toMatchObject({ payable: true });
  });

  it("does not pause collection for one unclear hold before the deadline", async () => {
    const { resolve, plan } = await setup([], { held: 2 });
    const shareId = plan.shareIds[2] ?? "";
    await db.query(
      `UPDATE shares SET status = 'checkout_open', checkout_attempt = 1, order_id = 'ORDX',
         approve_url = 'https://www.sandbox.paypal.com/checkoutnow?token=ORDX' WHERE id = $1`,
      [shareId],
    );
    await insertOperation(db, shareId, "authorize", `au:${shareId}`);
    await db.query("UPDATE shares SET status = 'authorize_unknown' WHERE id = $1", [shareId]);

    expect((await resolve()).status).toBe(200);
    expect(await state(plan.contractId)).toMatchObject({ status: "active" });
  });
});

describe("release", () => {
  it("voids every hold at grace end and expires the grace person (test 61)", async () => {
    const { clock, calls, plan } = await setup([VOIDED_STEP, VOIDED_STEP, VOIDED_STEP]);
    await clock(plan.deadline);
    const res = await clock(later(plan.graceUntil ?? plan.deadline));
    expect(res.status).toBe(200);

    expect(calls("void").map((call) => call.headers["paypal-request-id"])).toEqual([
      "fb-void-AUTH1",
      "fb-void-AUTH2",
      "fb-void-AUTH3",
    ]);
    const after = await state(plan.contractId);
    expect(after).toMatchObject({
      status: "released",
      direction: "release",
      shares: { A: "released", B: "released", C: "released", D: "expired" },
    });
    expect(after.resolution_reason).toContain("D's grace ended");
    expect(after.resolution_reason).toContain("Nobody was charged");
  });

  it("sends nothing on a second resolve (test 62)", async () => {
    const { clock, resolve, calls, plan } = await setup([VOIDED_STEP, VOIDED_STEP, VOIDED_STEP]);
    await clock(later(plan.graceUntil ?? plan.deadline));
    const again = await resolve();
    expect(again.status).toBe(409);
    expect(errorOf(again)).toBe("contract_closed");
    expect(calls("void")).toHaveLength(3);
  });

  it("releases at the deadline when grace could not complete the group", async () => {
    const { clock, plan } = await setup([VOIDED_STEP, VOIDED_STEP], { held: 2 });
    await clock(plan.deadline);
    const after = await state(plan.contractId);
    expect(after).toMatchObject({ status: "released", shares: { C: "expired", D: "expired" } });
    expect(after.resolution_reason).toContain("at the deadline");
  });

  it("pauses on a lost void and resumes after sync, with one void per hold (test 68)", async () => {
    const { clock, resolve, sync, calls, plan } = await setup([
      VOIDED_STEP,
      { fail: "timeout" },
      { body: { id: "AUTH2", status: "VOIDED" } },
      VOIDED_STEP,
    ]);
    const stopped = await clock(later(plan.graceUntil ?? plan.deadline));
    expect(stopped.status).toBe(409);
    expect(errorOf(stopped)).toBe("money_unknown");
    expect((stopped.body as { contract_read: ContractRead }).contract_read.contract.status).toBe("blocked");
    expect(await state(plan.contractId)).toMatchObject({ status: "blocked", shares: { B: "void_unknown" } });

    await sync(plan.shareIds[1] ?? "");
    expect(await state(plan.contractId)).toMatchObject({ shares: { B: "released" } });
    expect((await resolve()).status).toBe(200);
    expect(await state(plan.contractId)).toMatchObject({ status: "released", direction: "release" });
    expect(calls("void").map((call) => call.headers["paypal-request-id"])).toEqual([
      "fb-void-AUTH1",
      "fb-void-AUTH2",
      "fb-void-AUTH3",
    ]);
  });

  it("treats a refused void on a hold that is already gone as released (test 69)", async () => {
    const { clock, calls, paypal, plan } = await setup(
      [
        VOIDED_STEP,
        { status: 422, body: refusal("UNPROCESSABLE_ENTITY", "PREVIOUSLY_VOIDED") },
        { body: { id: "AUTH2", status: "VOIDED" } },
        VOIDED_STEP,
      ],
      { held: 3 },
    );
    expect((await clock(later(plan.graceUntil ?? plan.deadline))).status).toBe(200);
    expect(await state(plan.contractId)).toMatchObject({ status: "released", shares: { B: "released" } });
    expect(calls("void")).toHaveLength(3);
    expect(paypal.apiCalls().filter((call) => call.method === "GET")).toHaveLength(1);
  });
});

describe("keep", () => {
  it("captures everyone when all are held (test 63)", async () => {
    const { resolve, calls, plan } = await setup([capture(1), capture(2), capture(3), capture(4)], {
      held: 4,
      grace: null,
    });
    const res = await resolve();
    expect(res.status).toBe(200);

    const sent = calls("capture");
    expect(sent.map((call) => call.headers["paypal-request-id"])).toEqual([
      "fb-capture-AUTH1",
      "fb-capture-AUTH2",
      "fb-capture-AUTH3",
      "fb-capture-AUTH4",
    ]);
    expect(JSON.parse(sent[0]?.body ?? "")).toMatchObject({
      final_capture: true,
      amount: { currency_code: "USD", value: "80.00" },
    });
    const after = await state(plan.contractId);
    expect(after).toMatchObject({ status: "kept", direction: "keep" });
    expect(after.captures).toEqual([
      "TESTCAPTURE00001",
      "TESTCAPTURE00002",
      "TESTCAPTURE00003",
      "TESTCAPTURE00004",
    ]);
    expect(calls("void")).toHaveLength(0);
  });

  it("keeps in the same request as the fourth hold (test 64)", async () => {
    const { app, plan } = await setup(
      [
        { status: 201, body: CREATED_ORDER },
        { status: 201, body: authorizedOrder() },
        capture(1),
        capture(2),
        capture(3),
        capture(4),
      ],
      { held: 3 },
    );
    const fourth = plan.shareIds[3] ?? "";
    await request(app).post(`/api/shares/${fourth}/checkout`).set("Origin", ORIGIN).send({});
    const res = await request(app)
      .post(`/api/shares/${fourth}/authorize`)
      .set("Origin", ORIGIN)
      .send({ order_id: ORDER_ID });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      outcome: "completed",
      share: { status: "kept", authorization_id: HOLD_ID },
      contract: { status: "kept" },
    });
  });

  it("pauses on a lost capture and sends nothing more until sync (test 66)", async () => {
    const { resolve, calls, plan } = await setup([capture(1), { fail: "timeout" }], { held: 4, grace: null });
    const first = await resolve();
    expect(first.status).toBe(409);
    expect(errorOf(first)).toBe("money_unknown");
    expect(await state(plan.contractId)).toMatchObject({
      status: "blocked",
      shares: { A: "kept", B: "capture_unknown", C: "held", D: "held" },
    });

    const second = await resolve();
    expect(errorOf(second)).toBe("money_unknown");
    expect(calls("capture")).toHaveLength(2);
  });

  it("resumes the capture after sync, keeping the direction (test 67)", async () => {
    const { resolve, sync, calls, plan } = await setup(
      [
        capture(1),
        { fail: "timeout" },
        { body: { id: "AUTH2", status: "CREATED" } },
        capture(2),
        capture(3),
        capture(4),
      ],
      { held: 4, grace: null },
    );
    await resolve();
    await sync(plan.shareIds[1] ?? "");
    expect(await state(plan.contractId)).toMatchObject({ status: "blocked", shares: { B: "held" } });

    expect((await resolve()).status).toBe(200);
    expect(await state(plan.contractId)).toMatchObject({ status: "kept", direction: "keep" });
    expect(calls("capture").map((call) => call.headers["paypal-request-id"])).toEqual([
      "fb-capture-AUTH1",
      "fb-capture-AUTH2",
      "fb-capture-AUTH2",
      "fb-capture-AUTH3",
      "fb-capture-AUTH4",
    ]);
  });

  it("stores the capture PayPal already made when it refuses a repeat", async () => {
    const { resolve, plan } = await setup(
      [
        { status: 422, body: refusal("UNPROCESSABLE_ENTITY", "AUTHORIZATION_ALREADY_CAPTURED") },
        {
          body: {
            id: "ORD1",
            status: "COMPLETED",
            purchase_units: [{ payments: { captures: [{ id: "TESTCAPTURE00009", status: "COMPLETED" }] } }],
          },
        },
        capture(2),
        capture(3),
        capture(4),
      ],
      { held: 4, grace: null },
    );
    expect((await resolve()).status).toBe(200);
    expect((await state(plan.contractId)).captures[0]).toBe("TESTCAPTURE00009");
  });

  it("pauses on a refused capture, and resolve then answers capture_refused (test 70)", async () => {
    const { resolve, calls, plan } = await setup(
      [
        { status: 422, body: refusal("UNPROCESSABLE_ENTITY", "AUTHORIZATION_VOIDED") },
        { body: { id: "ORD1", status: "COMPLETED" } },
      ],
      { held: 4, grace: null },
    );
    const first = await resolve();
    expect(errorOf(first)).toBe("capture_refused");
    const after = await state(plan.contractId);
    expect(after).toMatchObject({ status: "blocked", shares: { A: "capture_failed" } });
    expect(after.resolution_reason).toContain("A");

    const second = await resolve();
    expect(second.status).toBe(409);
    expect(errorOf(second)).toBe("capture_refused");
    expect(calls("capture")).toHaveLength(1);
  });

  it("runs one capture wave when two resolves race (test 75)", async () => {
    const slow = () => new Promise<void>((done) => setTimeout(done, 150));
    const { resolve, calls, plan } = await setup(
      [{ ...capture(1), during: slow }, capture(2), capture(3), capture(4)],
      { held: 4, grace: null },
    );
    const results = await Promise.all([resolve(), resolve()]);
    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(errorOf(results.find((res) => res.status === 409) ?? { body: {} })).toBe("resolve_in_progress");
    expect(calls("capture")).toHaveLength(4);
    expect(await state(plan.contractId)).toMatchObject({ status: "kept" });
  });
});

describe("clock", () => {
  it("refuses to move backward once a payment was held (test 72)", async () => {
    const { clock, plan } = await setup([]);
    await db.query(
      "INSERT INTO events (contract_id, share_id, type, detail, occurred_at) VALUES ($1, $2, 'hold_placed', 'x', now())",
      [plan.contractId, plan.shareIds[0]],
    );
    const res = await clock(new Date(plan.deadline.getTime() - 86_400_000 * 3));
    expect(res.status).toBe(409);
    expect(errorOf(res)).toBe("bad_clock");
  });

  it("refuses a time that is not a full timestamp", async () => {
    const { app, cookie, plan } = await setup([]);
    const res = await request(app)
      .post(`/api/contracts/${plan.contractId}/clock`)
      .set("Origin", ORIGIN)
      .set("Cookie", cookie)
      .send({ demo_now: "tomorrow" });
    expect(res.status).toBe(400);
  });

  it("is only for the plan's owner", async () => {
    const { app, plan } = await setup([]);
    const other = await request(app).post("/api/auth/guest").set("Origin", ORIGIN).send({});
    const res = await request(app)
      .post(`/api/contracts/${plan.contractId}/resolve`)
      .set("Origin", ORIGIN)
      .set("Cookie", sessionCookie(other))
      .send({});
    expect(res.status).toBe(404);
  });
});

describe("sample plans resolve locally (test 71)", () => {
  it("releases the cabin at grace end and keeps the print run, without calling PayPal", async () => {
    const { app, paypal, cookie } = await setup([]);
    const list = await request(app).get("/api/contracts").set("Cookie", cookie);
    const [cabin, print] = (list.body as { contracts: ContractSummary[] }).contracts;
    const post = (id: string, path: string, body: object = {}) =>
      request(app)
        .post(`/api/contracts/${id}/${path}`)
        .set("Origin", ORIGIN)
        .set("Cookie", cookie)
        .send(body);

    const cabinRead = await post(cabin?.id ?? "", "clock", { demo_now: "2026-11-10T03:00:00Z" });
    expect(cabinRead.status).toBe(200);
    expect((cabinRead.body as ContractRead).contract.status).toBe("released");
    expect((cabinRead.body as ContractRead).shares.map((share) => share.status)).toEqual([
      "released",
      "released",
      "released",
      "expired",
    ]);

    const printRead = await post(print?.id ?? "", "resolve");
    expect((printRead.body as ContractRead).contract.status).toBe("kept");
    expect(paypal.calls).toHaveLength(0);
  });
});

describe("when PayPal cannot be reached", () => {
  it("pauses without marking the capture failed, and a later resolve finishes", async () => {
    const down = await setup([], { held: 4, grace: null, token: { status: 500, body: {} } });
    const stopped = await down.resolve();
    expect(stopped.status).toBe(502);
    expect(await state(down.plan.contractId)).toMatchObject({
      status: "blocked",
      direction: "keep",
      shares: { A: "held", B: "held", C: "held", D: "held" },
    });
    expect(down.calls("capture")).toHaveLength(0);

    const paypal = scriptedPayPal([capture(1), capture(2), capture(3), capture(4)]);
    const up = buildApp(pools, { env: PAYPAL_KEYS, paypalFetch: paypal.fetch });
    const res = await request(up)
      .post(`/api/contracts/${down.plan.contractId}/resolve`)
      .set("Origin", ORIGIN)
      .set("Cookie", down.cookie)
      .send({});
    expect(res.status).toBe(200);
    expect(await state(down.plan.contractId)).toMatchObject({ status: "kept" });
  });

  it("sends nothing while the kill switch is on", async () => {
    const { resolve, paypal, plan } = await setup([], {
      held: 4,
      grace: null,
      env: { PAYPAL_WRITES_ENABLED: "false" },
    });
    const res = await resolve();
    expect(res.status).toBe(503);
    expect(paypal.calls).toHaveLength(0);
    expect(await state(plan.contractId)).toMatchObject({ shares: { A: "held" } });
  });
});
