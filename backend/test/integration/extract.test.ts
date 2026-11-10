import { PassThrough } from "node:stream";
import type { Express } from "express";
import request from "supertest";
import type { Extraction } from "../../src/domain/extraction";
import { createLogger } from "../../src/observability/logger";
import { sweepStaleDrafts } from "../../src/services/housekeeping.service";
import {
  CLARIFY_FALLBACK_QUESTION,
  CLARIFY_LIMIT_MESSAGE,
  FIXTURE_REFERENCE_AT,
} from "../../src/shared/rules";
import {
  BAD_MATH_READING,
  BAD_OFFSET_READING,
  BAD_QUOTE_READING,
  CABIN_CHAT_READING,
  HEADCOUNT_6_READING,
  INJECTED_READING,
  NO_TIME_ANSWERED_READING,
  NO_TIME_READING,
  THREE_PEOPLE_READING,
  TWO_GRACE_READING,
} from "../fixtures/llm";
import {
  BAD_MATH,
  CABIN_CHAT,
  HEADCOUNT_6,
  INJECTED,
  NO_PRICES,
  NO_TIME,
  TWO_GRACE,
} from "../fixtures/rules";
import { ORIGIN, buildApp, recordingNotifier, sessionCookie } from "../helpers/app";
import { createPools, prepareDatabase, truncateAll } from "../helpers/db";
import type { Pools } from "../helpers/db";
import { scripted, says } from "../helpers/llmStub";
import type { Step } from "../helpers/llmStub";

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

const NOW = (): Date => new Date(FIXTURE_REFERENCE_AT);
const MODEL_ENV = {
  GEMINI_API_KEY: "gemini-test-key",
  GROQ_API_KEY: "groq-test-key",
  LLM_CHAIN: "gemini:gemini-3.8-flash,groq:openai/gpt-oss-120b",
};

interface Session {
  id: string;
  cookie: string;
}

/** An app whose model is a script, a signed-in guest, and what the stub was asked. */
async function setup(steps: Step[], env: Record<string, string | undefined> = {}, now: () => Date = NOW) {
  const { fetch, calls } = scripted(steps);
  const notifier = recordingNotifier();
  const app = buildApp(pools, { env: { ...MODEL_ENV, ...env }, llmFetch: fetch, notifier, now });
  const res = await request(app).post("/api/auth/guest").set("Origin", ORIGIN).send({});
  const user: Session = { id: (res.body as { user: { id: string } }).user.id, cookie: sessionCookie(res) };
  return { app, user, calls, notifier };
}

function post(app: Express, user: Session | null, path: string, body: unknown): request.Test {
  const req = request(app).post(path).set("Origin", ORIGIN);
  return (user ? req.set("Cookie", user.cookie) : req).send(body as object);
}

const create = (app: Express, user: Session, rule_text: string, extra: object = {}) =>
  post(app, user, "/api/contracts", { rule_text, use_fixture_time: true, ...extra });

const confirmBody = (e: Extraction) => ({
  title: e.title,
  currency: e.currency,
  total_cents: e.total_cents,
  share_cents: e.share_cents,
  headcount: e.headcount,
  deadline_at: e.deadline_at,
  timezone: e.timezone,
  grace_person_name: e.grace_person_name,
  grace_until: e.grace_until,
  people: e.people,
});

async function stored(contractId: string): Promise<Record<string, unknown>> {
  const result = await pools.owner.query("SELECT * FROM contracts WHERE id = $1", [contractId]);
  return result.rows[0] as Record<string, unknown>;
}
async function shareRows(contractId: string): Promise<Record<string, unknown>[]> {
  const result = await pools.owner.query("SELECT * FROM shares WHERE contract_id = $1 ORDER BY position", [
    contractId,
  ]);
  return result.rows as Record<string, unknown>[];
}
async function eventTypes(contractId: string): Promise<string[]> {
  const result = await pools.owner.query<{ type: string }>(
    "SELECT type FROM events WHERE contract_id = $1 ORDER BY id",
    [contractId],
  );
  return result.rows.map((r) => r.type);
}

interface Created {
  contract_id: string;
  extraction: Extraction;
}

describe("create (test 27)", () => {
  it("reads the cabin chat into a complete plan and waits for confirmation, with no shares yet", async () => {
    const { app, user, calls, notifier } = await setup([says(CABIN_CHAT_READING)]);
    const res = await create(app, user, CABIN_CHAT);
    expect(res.status).toBe(200);
    const body = res.body as Created;
    expect(body.extraction).toMatchObject({
      title: "Cabin weekend",
      total_cents: 32000,
      share_cents: 8000,
      headcount: 4,
      grace_person_name: "Maya Shah",
      deadline_at: "2026-11-06T18:00:00-08:00",
      missing: [],
    });
    expect(calls).toHaveLength(1);
    const contract = await stored(body.contract_id);
    expect(contract).toMatchObject({ status: "awaiting_confirmation", money_source: "sandbox", title: null });
    expect(await shareRows(body.contract_id)).toHaveLength(0);
    expect(await eventTypes(body.contract_id)).toEqual(["rule_extracted"]);
    expect(notifier.contractEvents).toEqual([[body.contract_id, 2]]);
    const usage = await pools.owner.query("SELECT * FROM ai_usage");
    expect(usage.rows).toMatchObject([
      {
        route: "extract",
        provider: "gemini",
        model: "gemini-3.8-flash",
        succeeded: true,
        cached: false,
        user_id: user.id,
        contract_id: body.contract_id,
        input_tokens: 120,
      },
    ]);
  });

  it("uses the fixed paste time only for the demo texts, and the clock otherwise", async () => {
    const later = new Date("2026-11-02T09:00:00-08:00");
    const { app, user } = await setup([says(CABIN_CHAT_READING), says(NO_TIME_READING)], {}, () => later);
    const demo = (await create(app, user, CABIN_CHAT)).body as Created;
    expect((await stored(demo.contract_id))["reference_at"]).toEqual(new Date(FIXTURE_REFERENCE_AT));
    const other = (await create(app, user, NO_TIME)).body as { contract_id: string };
    expect((await stored(other.contract_id))["reference_at"]).toEqual(later);
  });

  it("needs a signed-in user and an allowed origin, and refuses unknown fields and bad text", async () => {
    const { app, user } = await setup([says(CABIN_CHAT_READING)]);
    expect((await post(app, null, "/api/contracts", { rule_text: "x" })).status).toBe(401);
    const noOrigin = await request(app)
      .post("/api/contracts")
      .set("Cookie", user.cookie)
      .send({ rule_text: "x" });
    expect(noOrigin.status).toBe(403);
    for (const body of [
      {},
      { rule_text: "" },
      { rule_text: "   " },
      { rule_text: "x".repeat(6001) },
      { rule_text: "x", extra: 1 },
    ]) {
      expect((await post(app, user, "/api/contracts", body)).status).toBe(400);
    }
  });
});

describe("confirm (tests 28 and 33)", () => {
  it("inserts one waiting sandbox share per person and starts the demo clock two hours early", async () => {
    const { app, user, notifier } = await setup([says(CABIN_CHAT_READING)]);
    const { contract_id } = (await create(app, user, CABIN_CHAT)).body as Created;
    const res = await post(
      app,
      user,
      `/api/contracts/${contract_id}/confirm`,
      confirmBody(CABIN_CHAT_READING),
    );
    expect(res.status).toBe(200);
    const read = res.body as {
      contract: { status: string; demo_now: string; title: string };
      shares: {
        display_name: string;
        status: string;
        amount_cents: number;
        money_source: string;
        is_grace_subject: boolean;
        payable: boolean;
      }[];
    };
    expect(read.contract).toMatchObject({
      status: "active",
      title: "Cabin weekend",
      demo_now: "2026-11-07T00:00:00.000Z",
    });
    expect(
      read.shares.map((s) => [
        s.display_name,
        s.status,
        s.amount_cents,
        s.money_source,
        s.is_grace_subject,
        s.payable,
      ]),
    ).toEqual([
      ["Alex Chen", "waiting", 8000, "sandbox", false, true],
      ["Sam Ortiz", "waiting", 8000, "sandbox", false, true],
      ["Jordan Lee", "waiting", 8000, "sandbox", false, true],
      ["Maya Shah", "waiting", 8000, "sandbox", true, true],
    ]);
    const row = await stored(contract_id);
    expect(row["confirmed_at"]).not.toBeNull();
    expect(await eventTypes(contract_id)).toEqual(["rule_extracted", "rule_confirmed"]);
    expect(notifier.contractEvents.map(([, v]) => v)).toEqual([2, 4]);
  });

  it("rejects a tampered confirm with 422 confirm_mismatch and changes nothing", async () => {
    const { app, user, notifier } = await setup([says(CABIN_CHAT_READING)]);
    const { contract_id } = (await create(app, user, CABIN_CHAT)).body as Created;
    const tampers: object[] = [
      { share_cents: 100, total_cents: 400 },
      { total_cents: 31900 },
      { title: "Cabin" },
      { deadline_at: "2026-11-07T18:00:00-08:00" },
      { grace_until: null, grace_person_name: null },
      { people: ["Sam Ortiz", "Alex Chen", "Jordan Lee", "Maya Shah"] },
      { people: ["Alex Chen", "Sam Ortiz", "Jordan Lee", "Mallory"] },
      { headcount: 3 },
      { currency: "EUR" },
    ];
    for (const change of tampers) {
      const res = await post(app, user, `/api/contracts/${contract_id}/confirm`, {
        ...confirmBody(CABIN_CHAT_READING),
        ...change,
      });
      expect(res.status).toBe(422);
      expect((res.body as { error: string }).error).toBe("confirm_mismatch");
    }
    expect((await stored(contract_id))["status"]).toBe("awaiting_confirmation");
    expect(await shareRows(contract_id)).toHaveLength(0);
    expect(notifier.contractEvents).toHaveLength(1);
  });

  it("refuses a body with a missing or extra field", async () => {
    const { app, user } = await setup([says(CABIN_CHAT_READING)]);
    const { contract_id } = (await create(app, user, CABIN_CHAT)).body as Created;
    const full = confirmBody(CABIN_CHAT_READING);
    const withoutPeople: Record<string, unknown> = { ...full };
    delete withoutPeople["people"];
    for (const body of [withoutPeople, { ...full, extra: true }]) {
      expect((await post(app, user, `/api/contracts/${contract_id}/confirm`, body)).status).toBe(400);
    }
  });

  it("cannot confirm twice, and two at once make exactly one set of shares", async () => {
    const { app, user } = await setup([says(CABIN_CHAT_READING)]);
    const { contract_id } = (await create(app, user, CABIN_CHAT)).body as Created;
    const body = confirmBody(CABIN_CHAT_READING);
    const both = await Promise.all([
      post(app, user, `/api/contracts/${contract_id}/confirm`, body),
      post(app, user, `/api/contracts/${contract_id}/confirm`, body),
    ]);
    expect(both.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((both.find((r) => r.status === 409)?.body as { error: string }).error).toBe("contract_closed");
    expect(await shareRows(contract_id)).toHaveLength(4);
  });

  it("refuses to confirm a plan that still needs an answer, and someone else's plan is 404", async () => {
    const { app, user } = await setup([says(NO_TIME_READING)]);
    const asking = (await create(app, user, NO_TIME)).body as { contract_id: string };
    const early = await post(
      app,
      user,
      `/api/contracts/${asking.contract_id}/confirm`,
      confirmBody(CABIN_CHAT_READING),
    );
    expect(early.status).toBe(422);
    expect((early.body as { error: string }).error).toBe("needs_clarification");
    expect(await shareRows(asking.contract_id)).toHaveLength(0);

    const stranger = await request(app).post("/api/auth/guest").set("Origin", ORIGIN).send({});
    const other: Session = { id: "", cookie: sessionCookie(stranger) };
    const res = await post(
      app,
      other,
      `/api/contracts/${asking.contract_id}/confirm`,
      confirmBody(CABIN_CHAT_READING),
    );
    expect(res.status).toBe(404);
  });
});

describe("asking and answering (tests 29 to 32, 35)", () => {
  it("asks for the missing deadline time, and the answer completes it (no-time)", async () => {
    const { app, user, calls, notifier } = await setup([
      says(NO_TIME_READING),
      says(NO_TIME_ANSWERED_READING),
    ]);
    const first = await create(app, user, NO_TIME);
    expect(first.status).toBe(422);
    expect(first.body).toMatchObject({
      error: "needs_clarification",
      message: "What time on Friday is the deadline?",
      missing: ["deadline_at"],
    });
    const contractId = (first.body as { contract_id: string }).contract_id;
    expect((first.body as { extraction: Extraction }).extraction.deadline_at).toBeNull();
    expect(await stored(contractId)).toMatchObject({
      status: "needs_clarification",
      clarification_question: "What time on Friday is the deadline?",
    });

    const second = await post(app, user, `/api/contracts/${contractId}/clarify`, { answer: "6pm Pacific" });
    expect(second.status).toBe(200);
    expect((second.body as Created).extraction.deadline_at).toBe("2026-11-06T18:00:00-08:00");
    const row = await stored(contractId);
    expect(String(row["rule_text"]).endsWith("\n\n<organizer_answer>6pm Pacific</organizer_answer>")).toBe(
      true,
    );
    expect(row).toMatchObject({
      status: "awaiting_confirmation",
      clarify_rounds: 1,
      clarification_question: null,
    });
    expect(await eventTypes(contractId)).toEqual([
      "clarification_requested",
      "clarification_answered",
      "rule_extracted",
    ]);
    expect(calls).toHaveLength(2);
    expect(JSON.stringify(calls[1]?.body)).toContain("<organizer_answer>6pm Pacific</organizer_answer>");
    expect(notifier.contractEvents).toHaveLength(2);
  });

  it("asks which amount is right when the math does not add up (bad-math)", async () => {
    const { app, user } = await setup([says(BAD_MATH_READING)]);
    const res = await create(app, user, BAD_MATH);
    expect(res.status).toBe(422);
    const body = res.body as { missing: string[]; extraction: Extraction };
    expect(body.missing).toEqual(expect.arrayContaining(["total_cents", "share_cents"]));
    expect(body.extraction).toMatchObject({ total_cents: null, share_cents: null });
  });

  it("asks who the one grace person is when two were offered more time (two-grace)", async () => {
    const { app, user } = await setup([says(TWO_GRACE_READING)]);
    const res = await create(app, user, TWO_GRACE);
    expect(res.status).toBe(422);
    expect((res.body as { missing: string[] }).missing).toEqual(["grace_person_name"]);
    expect((res.body as { message: string }).message).toBe("Who is the one person who can pay Monday?");
  });

  it("asks again for a headcount of 6, and creates no shares (headcount-6)", async () => {
    const { app, user } = await setup([says(HEADCOUNT_6_READING)]);
    const res = await create(app, user, HEADCOUNT_6);
    expect(res.status).toBe(422);
    const contractId = (res.body as { contract_id: string }).contract_id;
    expect((res.body as { missing: string[] }).missing).toContain("headcount");
    expect(await shareRows(contractId)).toHaveLength(0);
  });

  it("needs as many names as the headcount (test 35)", async () => {
    const { app, user } = await setup([says(THREE_PEOPLE_READING)]);
    const res = await create(app, user, CABIN_CHAT);
    expect(res.status).toBe(422);
    expect((res.body as { missing: string[] }).missing).toEqual(["people"]);
  });

  it("allows 3 answers and refuses a fourth", async () => {
    const { app, user, calls } = await setup([
      says(NO_TIME_READING),
      says(NO_TIME_READING),
      says(NO_TIME_READING),
      says(NO_TIME_READING),
    ]);
    const contractId = ((await create(app, user, NO_TIME)).body as { contract_id: string }).contract_id;
    for (const answer of ["evening", "late", "after work"]) {
      expect((await post(app, user, `/api/contracts/${contractId}/clarify`, { answer })).status).toBe(422);
    }
    const fourth = await post(app, user, `/api/contracts/${contractId}/clarify`, { answer: "again" });
    expect(fourth.status).toBe(422);
    expect((fourth.body as { message: string }).message).toBe(CLARIFY_LIMIT_MESSAGE);
    expect(calls).toHaveLength(4);
    expect((await stored(contractId))["clarify_rounds"]).toBe(3);
  });

  it("lets only one of two simultaneous answers through, and reads the text once", async () => {
    const { app, user, calls } = await setup([says(NO_TIME_READING), says(NO_TIME_ANSWERED_READING)]);
    const contractId = ((await create(app, user, NO_TIME)).body as { contract_id: string }).contract_id;
    const both = await Promise.all([
      post(app, user, `/api/contracts/${contractId}/clarify`, { answer: "6pm Pacific" }),
      post(app, user, `/api/contracts/${contractId}/clarify`, { answer: "7pm Pacific" }),
    ]);
    expect(both.map((r) => r.status).filter((status) => status === 409)).toHaveLength(1);
    expect(calls).toHaveLength(2);
    expect((await stored(contractId))["clarify_rounds"]).toBe(1);
  });

  it("only answers a plan that is asking, and only the owner's", async () => {
    const { app, user } = await setup([says(CABIN_CHAT_READING), says(NO_TIME_READING)]);
    const ready = (await create(app, user, CABIN_CHAT)).body as Created;
    const notAsking = await post(app, user, `/api/contracts/${ready.contract_id}/clarify`, { answer: "x" });
    expect(notAsking.status).toBe(409);
    expect((notAsking.body as { error: string }).error).toBe("contract_closed");

    const asking = ((await create(app, user, NO_TIME)).body as { contract_id: string }).contract_id;
    const stranger = await request(app).post("/api/auth/guest").set("Origin", ORIGIN).send({});
    const other: Session = { id: "", cookie: sessionCookie(stranger) };
    expect((await post(app, other, `/api/contracts/${asking}/clarify`, { answer: "x" })).status).toBe(404);
    expect((await post(app, user, `/api/contracts/${asking}/clarify`, { answer: "" })).status).toBe(400);
    expect(
      (await post(app, user, `/api/contracts/${asking}/clarify`, { answer: "x".repeat(501) })).status,
    ).toBe(400);
    expect((await post(app, user, "/api/contracts/con_short/clarify", { answer: "x" })).status).toBe(404);
  });
});

describe("what the server will not believe (tests 34, 36 to 38)", () => {
  it("drops a quote that is not in the text, and the plan is still complete (test 34)", async () => {
    const { app, user } = await setup([says(BAD_QUOTE_READING)]);
    const res = await create(app, user, CABIN_CHAT);
    expect(res.status).toBe(200);
    expect((res.body as Created).extraction.evidence.map((e) => e.field)).toEqual([
      "total_cents",
      "share_cents",
      "deadline_at",
      "grace_until",
    ]);
  });

  it("rejects an injected price (test 36)", async () => {
    const { app, user } = await setup([says(INJECTED_READING)]);
    const res = await create(app, user, INJECTED);
    expect(res.status).toBe(422);
    expect((res.body as { extraction: Extraction }).extraction).toMatchObject({
      total_cents: null,
      share_cents: null,
    });
  });

  it("rejects an invented price (test 37)", async () => {
    const { app, user } = await setup([says(CABIN_CHAT_READING)]);
    const res = await create(app, user, NO_PRICES, { use_fixture_time: false });
    expect(res.status).toBe(422);
    expect((res.body as { extraction: Extraction }).extraction).toMatchObject({
      total_cents: null,
      share_cents: null,
    });
  });

  it("fixes the offset the model got wrong (test 38)", async () => {
    const { app, user } = await setup([says(BAD_OFFSET_READING)]);
    const res = await create(app, user, CABIN_CHAT);
    expect((res.body as Created).extraction.deadline_at).toBe("2026-11-06T18:00:00-08:00");
    expect((await stored((res.body as Created).contract_id))["status"]).toBe("awaiting_confirmation");
  });

  it("maps a refusal from every model to the fixed question (test 39)", async () => {
    const { app, user } = await setup([{ finish: "content_filter" }, { finish: "content_filter" }]);
    const res = await create(app, user, CABIN_CHAT);
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      error: "needs_clarification",
      message: CLARIFY_FALLBACK_QUESTION,
      extraction: null,
      missing: [],
    });
    const contractId = (res.body as { contract_id: string }).contract_id;
    expect(await stored(contractId)).toMatchObject({ status: "needs_clarification", extraction: null });
  });
});

describe("plans left unfinished by a restart", () => {
  it("removes a new draft and returns an answered one to asking, once they are stale", async () => {
    const { app, user } = await setup([says(NO_TIME_READING)]);
    const asking = ((await create(app, user, NO_TIME)).body as { contract_id: string }).contract_id;
    const insert = (id: string, rounds: number, minutesAgo: number) =>
      pools.owner.query(
        `INSERT INTO contracts (id, owner_id, rule_text, rule_hash, reference_at, status, money_source, clarify_rounds, updated_at)
         VALUES ($1, $2, 'x', 'h', now(), 'extracting', 'sandbox', $3, now() - make_interval(mins => $4))`,
        [id, user.id, rounds, minutesAgo],
      );
    await insert(`con_${"1".padStart(22, "0")}`, 0, 30);
    await insert(`con_${"2".padStart(22, "0")}`, 2, 30);
    await insert(`con_${"3".padStart(22, "0")}`, 0, 1);

    const logger = createLogger({ level: "error", json: true, stream: new PassThrough() });
    expect(await sweepStaleDrafts(pools.app, logger)).toBe(2);
    const statuses = await pools.owner.query<{ id: string; status: string }>(
      "SELECT id, status FROM contracts WHERE seed_key IS NULL ORDER BY id",
    );
    expect(statuses.rows.map((r) => r.status).sort()).toEqual([
      "extracting",
      "needs_clarification",
      "needs_clarification",
    ]);
    expect(statuses.rows.map((r) => r.id)).toContain(asking);
  });
});
