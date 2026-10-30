import request from "supertest";
import type { ContractSummary, SchedulerProjection } from "../../src/shared/api-types";
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

type App = ReturnType<typeof buildApp>;

async function newGuest(app: App): Promise<{ id: string; cookie: string }> {
  const res = await request(app).post("/api/auth/guest").set("Origin", ORIGIN).send({});
  return { id: (res.body as { user: { id: string } }).user.id, cookie: sessionCookie(res) };
}

async function cabinId(app: App, cookie: string): Promise<string> {
  const res = await request(app).get("/api/contracts").set("Cookie", cookie);
  return (res.body as { contracts: ContractSummary[] }).contracts[0]?.id ?? "";
}

describe("GET /api/contracts/:id/scheduler", () => {
  it("projects the cabin sample: window, one bar per person, markers", async () => {
    const app = buildApp(pools);
    const guest = await newGuest(app);
    const res = await request(app)
      .get(`/api/contracts/${await cabinId(app, guest.cookie)}/scheduler`)
      .set("Cookie", guest.cookie);
    expect(res.status).toBe(200);
    const body = res.body as SchedulerProjection;
    expect(body.timezone).toBe("America/Los_Angeles");
    expect(body.start).toBe("2026-11-06T08:00:00-08:00");
    expect(body.end).toBe("2026-11-11T20:00:00-08:00");
    expect(body.resources.map((r) => [r.name, r.badge])).toEqual([
      ["Alex Chen", "Sample"],
      ["Sam Ortiz", "Sample"],
      ["Jordan Lee", "Sample"],
      ["Maya Shah", "Sample"],
    ]);
    expect(body.events.map((e) => [e.name, e.eventColor, e.startDate, e.endDate])).toEqual([
      ["Held", "blue", "2026-11-06T08:00:00-08:00", "2026-11-06T18:00:00-08:00"],
      ["Held", "blue", "2026-11-06T08:00:00-08:00", "2026-11-06T18:00:00-08:00"],
      ["Held", "blue", "2026-11-06T08:00:00-08:00", "2026-11-06T18:00:00-08:00"],
      ["Waiting", "gray", "2026-11-06T08:00:00-08:00", "2026-11-06T18:00:00-08:00"],
    ]);
    expect(body.timeRanges.map((t) => [t.id, t.startDate])).toEqual([
      ["deadline", "2026-11-06T18:00:00-08:00"],
      ["grace", "2026-11-09T18:00:00-08:00"],
      ["now", "2026-11-06T16:00:00-08:00"],
    ]);
  });

  it("shows the PayPal id for a sandbox hold and none for a sample", async () => {
    const app = buildApp(pools);
    const guest = await newGuest(app);
    const { contractId, shareIds } = await confirmed(pools.app, guest.id, ["P", "Q"]);
    await hold(pools.app, shareIds[0] ?? "", 1);
    const res = await request(app).get(`/api/contracts/${contractId}/scheduler`).set("Cookie", guest.cookie);
    const body = res.body as SchedulerProjection;
    expect(body.resources.map((r) => r.badge)).toEqual(["Sandbox", "Sandbox"]);
    expect(body.events.map((e) => [e.status, e.paypalId])).toEqual([
      ["held", "AUTH1"],
      ["waiting", null],
    ]);
  });

  it("answers someone else's plan, a malformed id and a signed-out call without leaking", async () => {
    const app = buildApp(pools);
    const a = await newGuest(app);
    const b = await newGuest(app);
    const aPlan = await cabinId(app, a.cookie);
    const others = await request(app).get(`/api/contracts/${aPlan}/scheduler`).set("Cookie", b.cookie);
    const missing = await request(app)
      .get(`/api/contracts/${newId("con")}/scheduler`)
      .set("Cookie", b.cookie);
    const malformed = await request(app).get("/api/contracts/nope/scheduler").set("Cookie", a.cookie);
    expect([others.status, missing.status, malformed.status]).toEqual([404, 404, 404]);
    expect((await request(app).get(`/api/contracts/${aPlan}/scheduler`)).status).toBe(401);
  });
});
