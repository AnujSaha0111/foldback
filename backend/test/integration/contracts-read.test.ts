import request from "supertest";
import type { ContractRead, ContractSummary } from "../../src/shared/api-types";
import { ORIGIN, buildApp, sessionCookie } from "../helpers/app";
import { confirmed, createPools, hold, newId, prepareDatabase, truncateAll } from "../helpers/db";
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

function get(app: ReturnType<typeof buildApp>, path: string, session?: Session): request.Test {
  const req = request(app).get(path);
  return session ? req.set("Cookie", session.cookie) : req;
}

async function list(app: ReturnType<typeof buildApp>, session: Session): Promise<ContractSummary[]> {
  const res = await get(app, "/api/contracts", session);
  expect(res.status).toBe(200);
  return (res.body as { contracts: ContractSummary[] }).contracts;
}

describe("list (test 20)", () => {
  it("needs a signed-in user", async () => {
    const res = await get(buildApp(pools), "/api/contracts");
    expect(res.status).toBe(401);
  });

  it("returns only the caller's two samples, cabin first, with derived counts", async () => {
    const app = buildApp(pools);
    const a = await newGuest(app);
    await newGuest(app);
    const contracts = await list(app, a);
    expect(contracts.map((c) => c.seed_key)).toEqual(["cabin-hold", "print-full"]);
    expect(contracts[0]).toMatchObject({
      title: "Cabin weekend",
      status: "active",
      money_source: "sample",
      headcount: 4,
      held_count: 3,
      kept_count: 0,
      released_count: 0,
      share_cents: 8000,
      deadline_at: "2026-11-07T02:00:00.000Z",
      demo_now: "2026-11-07T00:00:00.000Z",
      resolution_reason: null,
    });
    expect(contracts[1]).toMatchObject({ title: "Print run", held_count: 4, share_cents: 5000 });
  });

  it("puts a newer plan after the samples", async () => {
    const app = buildApp(pools);
    const a = await newGuest(app);
    await confirmed(pools.app, a.id, ["P", "Q"]);
    const contracts = await list(app, a);
    expect(contracts).toHaveLength(3);
    expect(contracts[2]?.seed_key).toBeNull();
    expect(contracts[2]?.money_source).toBe("sandbox");
  });
});

describe("read", () => {
  it("returns the full read model for the caller's own contract", async () => {
    const app = buildApp(pools);
    const a = await newGuest(app);
    const cabin = (await list(app, a))[0];
    const res = await get(app, `/api/contracts/${cabin?.id}`, a);
    expect(res.status).toBe(200);
    const body = res.body as ContractRead;
    expect(body.contract).toMatchObject({
      id: cabin?.id,
      seed_key: "cabin-hold",
      status: "active",
      direction: null,
      currency: "USD",
      total_cents: 32000,
      timezone: "America/Los_Angeles",
      grace_person_name: "Maya Shah",
      grace_until: "2026-11-10T02:00:00.000Z",
      clarification_question: null,
    });
    expect(body.shares.map((s) => [s.display_name, s.status, s.is_grace_subject])).toEqual([
      ["Alex Chen", "held", false],
      ["Sam Ortiz", "held", false],
      ["Jordan Lee", "held", false],
      ["Maya Shah", "waiting", true],
    ]);
    for (const share of body.shares) {
      expect(share).toMatchObject({
        money_source: "sample",
        payable: false,
        sample_label: "Sample — no PayPal hold",
      });
      expect(share.pay_path).toBe(`/pay/${share.id}`);
      expect([share.order_id, share.authorization_id, share.capture_id]).toEqual([null, null, null]);
    }
    expect(body.events).toEqual([]);
  });

  it("answers someone else's contract exactly like a missing one: 404 not_found", async () => {
    const app = buildApp(pools);
    const a = await newGuest(app);
    const b = await newGuest(app);
    const aContract = (await list(app, a))[0]?.id ?? "";
    const others = await get(app, `/api/contracts/${aContract}`, b);
    const missing = await get(app, `/api/contracts/${newId("con")}`, b);
    expect(others.status).toBe(404);
    expect(missing.status).toBe(404);
    const strip = (body: object): object => ({ ...body, request_id: undefined });
    expect(strip(others.body as object)).toEqual(strip(missing.body as object));
    expect((others.body as { error: string }).error).toBe("not_found");
  });

  it("answers a malformed id with 404 too", async () => {
    const app = buildApp(pools);
    const a = await newGuest(app);
    for (const id of ["nope", "con_short", "con_" + "x".repeat(40), "%27%20OR%201%3D1"]) {
      expect((await get(app, `/api/contracts/${id}`, a)).status).toBe(404);
    }
  });

  it("needs a signed-in user", async () => {
    const app = buildApp(pools);
    const a = await newGuest(app);
    const id = (await list(app, a))[0]?.id ?? "";
    expect((await get(app, `/api/contracts/${id}`)).status).toBe(401);
  });
});

describe("what the read model hides (test 24)", () => {
  it("never exposes the approval link, idempotency keys, or a password hash", async () => {
    const app = buildApp(pools);
    const signup = await request(app)
      .post("/api/auth/signup")
      .set("Origin", ORIGIN)
      .send({ email: "o@example.com", password: "a-long-password-1", display_name: "Owner" });
    const owner: Session = {
      id: (signup.body as { user: { id: string } }).user.id,
      cookie: sessionCookie(signup),
    };
    const { contractId, shareIds } = await confirmed(pools.app, owner.id, ["P", "Q"]);
    await hold(pools.app, shareIds[0] ?? "", 1);

    const res = await get(app, `/api/contracts/${contractId}`, owner);
    expect(res.status).toBe(200);
    const text = JSON.stringify(res.body);
    for (const secret of [
      "approve_url",
      "sandbox.paypal.com",
      "idempotency",
      "password",
      "$2b$",
      "co:",
      "au:",
    ]) {
      expect(text).not.toContain(secret);
    }
    const body = res.body as ContractRead;
    expect(body.shares[0]).toMatchObject({ status: "held", authorization_id: "AUTH1", order_id: "ORD1" });
    expect(Object.keys(body.shares[0] ?? {}).sort()).toEqual(
      [
        "amount_cents",
        "authorization_expires_at",
        "authorization_id",
        "capture_id",
        "display_name",
        "id",
        "is_grace_subject",
        "money_source",
        "order_id",
        "pay_path",
        "payable",
        "sample_label",
        "status",
      ].sort(),
    );
  });

  it("marks an open sandbox share payable and a held one not", async () => {
    const app = buildApp(pools);
    const a = await newGuest(app);
    const { contractId, shareIds } = await confirmed(pools.app, a.id, ["P", "Q"]);
    await hold(pools.app, shareIds[0] ?? "", 2);
    const body = (await get(app, `/api/contracts/${contractId}`, a)).body as ContractRead;
    expect(body.contract.money_source).toBe("sandbox");
    expect(body.shares.map((s) => [s.status, s.payable])).toEqual([
      ["held", false],
      ["waiting", true],
    ]);
  });
});

describe("events", () => {
  it("returns the newest 30, newest first, without ids", async () => {
    const app = buildApp(pools);
    const a = await newGuest(app);
    const { contractId } = await confirmed(pools.app, a.id, ["P", "Q"]);
    for (let i = 1; i <= 35; i += 1) {
      await pools.owner.query(
        "INSERT INTO events (contract_id, type, detail, occurred_at) VALUES ($1, 'clock_moved', $2, now())",
        [contractId, `event ${i}`],
      );
    }
    const body = (await get(app, `/api/contracts/${contractId}`, a)).body as ContractRead;
    expect(body.events).toHaveLength(30);
    expect(body.events[0]?.detail).toBe("event 35");
    expect(body.events[29]?.detail).toBe("event 6");
    expect(Object.keys(body.events[0] ?? {}).sort()).toEqual(["created_at", "detail", "share_id", "type"]);
  });
});
