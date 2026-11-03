import request from "supertest";
import type { Pool } from "pg";
import type { AgentResponse } from "../../src/shared/api-types";
import { ORIGIN, buildApp, sessionCookie } from "../helpers/app";
import {
  addShares,
  createPools,
  draft,
  hold,
  prepareDatabase,
  truncateAll,
  withTransaction,
} from "../helpers/db";
import type { Pools } from "../helpers/db";
import { scripted } from "../helpers/llmStub";
import type { Step } from "../helpers/llmStub";

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

const SECRET_RULE = "SECRET-RULE-TEXT-7f3a";
const MODEL_ENV = { GROQ_API_KEY: "groq-test-key", LLM_CHAIN: "groq:openai/gpt-oss-120b" };

const step = (value: object): Step => ({ content: JSON.stringify(value) });
const callTool = (tool: string, input: object) =>
  step({ action: "tool", tool, input_json: JSON.stringify(input), reply: "" });
const answer = (reply: string) => step({ action: "reply", tool: "", input_json: "", reply });

/** A guest's confirmed plan of four, D the grace person, three held. Its rule text is a marker the model must never see. */
async function setup(steps: Step[]) {
  const llm = scripted(steps);
  const app = buildApp(pools, { env: MODEL_ENV, llmFetch: llm.fetch });
  const guest = await request(app).post("/api/auth/guest").set("Origin", ORIGIN).send({});
  const cookie = sessionCookie(guest);
  const ownerId = (guest.body as { user: { id: string } }).user.id;
  const { contractId, shareIds } = await withTransaction(db, async (client) => {
    const id = await draft(client, ownerId, { headcount: 4, grace: "D" });
    await client.query("UPDATE contracts SET rule_text = $2 WHERE id = $1", [id, SECRET_RULE]);
    const ids = await addShares(client, id, ["A", "B", "C", "D"], { grace: "D" });
    await client.query(
      "UPDATE contracts SET status = 'active', confirmed_at = now(), demo_now = now() WHERE id = $1",
      [id],
    );
    return { contractId: id, shareIds: ids };
  });
  for (const [i, shareId] of shareIds.slice(0, 3).entries()) await hold(db, shareId, i + 1);

  const ask = (content: string) =>
    request(app)
      .post(`/api/contracts/${contractId}/agent`)
      .set("Origin", ORIGIN)
      .set("Cookie", cookie)
      .send({ messages: [{ role: "user", content }] });
  return { app, cookie, contractId, shareIds, ask, calls: llm.calls };
}

const demoNow = async (contractId: string) =>
  (await db.query<{ demo_now: Date }>("SELECT demo_now FROM contracts WHERE id = $1", [contractId])).rows[0]
    ?.demo_now;

describe("organizer agent", () => {
  it("answers from a simulation, moves nothing, and records every step (tests 76 and 84)", async () => {
    const { ask, contractId, calls } = await setup([
      callTool("simulate_outcome", { at: "grace_end", assume_held: [], assume_not_paying: ["D"] }),
      answer("If D doesn't pay by grace end, all three holds are released and nobody is charged."),
    ]);
    const before = await demoNow(contractId);

    const res = await ask("What happens if D doesn't pay?");
    expect(res.status).toBe(200);
    const body = res.body as AgentResponse;
    expect(body.reply).toContain("released");
    expect(body.tool_calls.map((call) => call.name)).toEqual(["simulate_outcome"]);
    expect(body.tool_calls[0]?.summary).toContain("with D unpaid");
    expect(await demoNow(contractId)).toEqual(before);
    expect(JSON.stringify(calls[1]?.body)).toContain('\\"voids\\":3');

    const usage = await db.query<{ route: string; contract_id: string }>(
      "SELECT route, contract_id FROM ai_usage",
    );
    expect(usage.rows).toEqual([
      { route: "agent", contract_id: contractId },
      { route: "agent", contract_id: contractId },
    ]);
  });

  it("returns a proposal without executing it, and approving it through the clock route records that (test 79)", async () => {
    const { ask, app, cookie, contractId } = await setup([
      callTool("propose_action", { kind: "move_clock", to: "deadline", why: "The deadline is next." }),
      answer("I proposed moving to the deadline."),
    ]);
    const before = await demoNow(contractId);
    const body = (await ask("Move to the deadline")).body as AgentResponse;
    expect(body.proposals).toHaveLength(1);
    expect(await demoNow(contractId)).toEqual(before);

    const proposal = body.proposals[0];
    const approved = await request(app)
      .post(`/api/contracts/${contractId}/clock?via=agent`)
      .set("Origin", ORIGIN)
      .set("Cookie", cookie)
      .send({ demo_now: proposal?.demo_now });
    expect(approved.status).toBe(200);
    const events = await db.query<{ type: string }>("SELECT type FROM events WHERE contract_id = $1", [
      contractId,
    ]);
    expect(events.rows.map((row) => row.type)).toContain("agent_proposal_approved");
  });

  it("drafts a reminder with the pay link for the person who can still pay (test 78)", async () => {
    const { ask, shareIds } = await setup([
      callTool("draft_reminder", { person: "a", message: "Hi A" }),
      callTool("draft_reminder", { person: "d", message: "Hey D, it's only a hold until Friday." }),
      answer("I drafted a reminder for D. A has already paid."),
    ]);
    const body = (await ask("Draft reminders for anyone unpaid")).body as AgentResponse;
    expect(body.drafts).toHaveLength(1);
    expect(body.drafts[0]).toMatchObject({ display_name: "D", share_id: shareIds[3] });
    expect(body.drafts[0]?.text).toContain(`/pay/${shareIds[3] ?? ""}`);
  });

  it("never sends the rule text to the model (test 83)", async () => {
    const { ask, calls } = await setup([callTool("get_status", {}), answer("Collecting.")]);
    await ask("Where does this stand?");
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(JSON.stringify(call.body)).not.toContain(SECRET_RULE);
  });

  it("answers 503 when every model fails, and the board still works (test 82)", async () => {
    const { ask, app, cookie, contractId } = await setup([{ status: 500 }]);
    const res = await ask("Hello?");
    expect(res.status).toBe(503);
    expect((res.body as { error: string; message: string }).error).toBe("agent_unavailable");
    expect((res.body as { message: string }).message).toBe(
      "The assistant is unavailable right now. The board and buttons still work.",
    );
    expect((await request(app).get(`/api/contracts/${contractId}`).set("Cookie", cookie)).status).toBe(200);
  });

  it("refuses a conversation that does not end with the organizer", async () => {
    const { app, cookie, contractId, calls } = await setup([]);
    const res = await request(app)
      .post(`/api/contracts/${contractId}/agent`)
      .set("Origin", ORIGIN)
      .set("Cookie", cookie)
      .send({ messages: [{ role: "assistant", content: "Hi" }] });
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("is only for the plan's owner", async () => {
    const { app, contractId, calls } = await setup([]);
    const other = await request(app).post("/api/auth/guest").set("Origin", ORIGIN).send({});
    const res = await request(app)
      .post(`/api/contracts/${contractId}/agent`)
      .set("Origin", ORIGIN)
      .set("Cookie", sessionCookie(other))
      .send({ messages: [{ role: "user", content: "Hi" }] });
    expect(res.status).toBe(404);
    expect(calls).toHaveLength(0);
  });
});
