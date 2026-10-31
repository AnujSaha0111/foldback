import request from "supertest";
import type { ContractSummary, PublicShare } from "../../src/shared/api-types";
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

async function read(app: App, shareId: string): Promise<PublicShare> {
  const res = await request(app).get(`/api/shares/${shareId}`);
  expect(res.status).toBe(200);
  return res.body as PublicShare;
}

describe("public share view (test 57)", () => {
  it("needs no session, and shows the payer's own view of a sandbox plan", async () => {
    const app = buildApp(pools);
    const guest = await newGuest(app);
    const { contractId, shareIds } = await confirmed(pools.app, guest.id, ["P", "Q"]);
    await hold(pools.app, shareIds[0] ?? "", 1);

    const body = await read(app, shareIds[1] ?? "");
    expect(body).toMatchObject({
      share_id: shareIds[1],
      contract_id: contractId,
      display_name: "Q",
      headcount: 2,
      held_count: 1,
      status: "waiting",
      money_source: "sandbox",
      payable: true,
      other_names: ["P"],
    });
  });

  it("never shows a PayPal id, an approval link or anyone else's status", async () => {
    const app = buildApp(pools);
    const guest = await newGuest(app);
    const { shareIds } = await confirmed(pools.app, guest.id, ["P", "Q"]);
    await hold(pools.app, shareIds[0] ?? "", 1);

    const body = await read(app, shareIds[0] ?? "");
    const text = JSON.stringify(body);
    for (const secret of ["AUTH1", "ORD1", "approve_url", "order_id", "authorization_id", "capture_id"]) {
      expect(text).not.toContain(secret);
    }
    expect(Object.keys(body).sort()).toEqual(
      [
        "amount_cents",
        "contract_id",
        "contract_status",
        "currency",
        "deadline_at",
        "demo_now",
        "display_name",
        "grace_until",
        "headcount",
        "held_count",
        "is_grace_subject",
        "money_source",
        "other_names",
        "payable",
        "share_id",
        "status",
        "timezone",
        "title",
      ].sort(),
    );
  });

  it("is not payable on a sample plan, and counts its holds", async () => {
    const app = buildApp(pools);
    const guest = await newGuest(app);
    const plans = await request(app).get("/api/contracts").set("Cookie", guest.cookie);
    const cabin = (plans.body as { contracts: ContractSummary[] }).contracts[0];
    const board = await request(app).get(`/api/contracts/${cabin?.id}`).set("Cookie", guest.cookie);
    const maya = (board.body as { shares: { id: string; display_name: string }[] }).shares.find(
      (share) => share.display_name === "Maya Shah",
    );

    expect(await read(app, maya?.id ?? "")).toMatchObject({
      money_source: "sample",
      payable: false,
      held_count: 3,
      is_grace_subject: true,
    });
  });

  it("answers an unknown id and a malformed one the same way", async () => {
    const app = buildApp(pools);
    const missing = await request(app).get(`/api/shares/${newId("shr")}`);
    const malformed = await request(app).get("/api/shares/nope");
    expect([missing.status, malformed.status]).toEqual([404, 404]);
    expect((missing.body as { message: string }).message).toBe("That pay link does not exist.");
    expect((malformed.body as { message: string }).message).toBe("That pay link does not exist.");
  });
});
