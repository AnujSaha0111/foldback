import type { Express } from "express";
import request from "supertest";
import type { Extraction } from "../../src/domain/extraction";
import {
  CLARIFY_FALLBACK_QUESTION,
  FIXTURE_REFERENCE_AT,
  MAX_DEMO_CONTRACTS,
  MAX_PLANS_PER_GUEST,
} from "../../src/shared/rules";
import { CABIN_CHAT_READING } from "../fixtures/llm";
import { CREATED_ORDER, PAYPAL_KEYS, scriptedPayPal } from "../fixtures/paypal";
import { CABIN_CHAT } from "../fixtures/rules";
import { ORIGIN, buildApp, recordingNotifier, sessionCookie } from "../helpers/app";
import type { BuildOptions } from "../helpers/app";
import { confirmed, createPools, member, prepareDatabase, truncateAll } from "../helpers/db";
import type { Pools } from "../helpers/db";
import { says, scripted } from "../helpers/llmStub";
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

const MODEL_ENV = {
  GEMINI_API_KEY: "gemini-test-key",
  GROQ_API_KEY: "groq-test-key",
  OPENROUTER_API_KEY: "openrouter-test-key",
  LLM_CHAIN:
    "gemini:gemini-3.8-flash,groq:openai/gpt-oss-120b,groq:openai/gpt-oss-20b,openrouter:openrouter/free",
};

async function setup(steps: Step[], options: BuildOptions = {}) {
  const { fetch, calls } = scripted(steps);
  const app = buildApp(pools, {
    ...options,
    env: { ...MODEL_ENV, ...options.env },
    llmFetch: fetch,
    notifier: recordingNotifier(),
    now: () => new Date(FIXTURE_REFERENCE_AT),
  });
  const res = await request(app).post("/api/auth/guest").set("Origin", ORIGIN).send({});
  const cookie = sessionCookie(res);
  return { app, cookie, userId: (res.body as { user: { id: string } }).user.id, calls };
}

const create = (app: Express, cookie: string, text: string = CABIN_CHAT) =>
  request(app)
    .post("/api/contracts")
    .set("Origin", ORIGIN)
    .set("Cookie", cookie)
    .send({ rule_text: text, use_fixture_time: true });

async function usage(): Promise<Record<string, unknown>[]> {
  return (await pools.owner.query("SELECT * FROM ai_usage ORDER BY id")).rows as Record<string, unknown>[];
}
async function planCount(): Promise<number> {
  const result = await pools.owner.query<{ count: string }>(
    "SELECT count(*) FROM contracts WHERE seed_key IS NULL",
  );
  return Number(result.rows[0]?.count);
}

describe("per-user AI limit (L2)", () => {
  it("stops the third create within a minute with Retry-After, and the stub was called twice", async () => {
    const { app, cookie, calls } = await setup([says(CABIN_CHAT_READING), says(CABIN_CHAT_READING)], {
      limits: { aiUserMinute: { limit: 2, windowMs: 60_000 } },
    });
    expect((await create(app, cookie, `${CABIN_CHAT} one`)).status).toBe(200);
    expect((await create(app, cookie, `${CABIN_CHAT} two`)).status).toBe(200);
    const third = await create(app, cookie, `${CABIN_CHAT} three`);
    expect(third.status).toBe(429);
    expect((third.body as { error: string }).error).toBe("rate_limited");
    expect(Number(third.headers["retry-after"])).toBeGreaterThan(0);
    expect(calls).toHaveLength(2);
  });

  it("limits new plans per user per day", async () => {
    const { app, cookie, calls } = await setup([says(CABIN_CHAT_READING)], {
      limits: { createContract: { limit: 1, windowMs: 86_400_000 } },
    });
    expect((await create(app, cookie, `${CABIN_CHAT} one`)).status).toBe(200);
    const second = await create(app, cookie, `${CABIN_CHAT} two`);
    expect(second.status).toBe(429);
    expect(Number(second.headers["retry-after"])).toBeGreaterThan(0);
    expect(calls).toHaveLength(1);
  });
});

describe("daily budget (L3) and kill switch (L6)", () => {
  it("answers 503 ai_budget_exhausted at the cap without calling the stub, and reads still work", async () => {
    const { app, cookie, calls } = await setup([says(CABIN_CHAT_READING)], { env: { AI_DAILY_CALLS: "2" } });
    await pools.owner.query(
      `INSERT INTO ai_usage (route, provider, model, ip_hash, input_tokens, output_tokens, succeeded)
       SELECT 'extract', 'groq', 'openai/gpt-oss-120b', 'x', 1, 1, true FROM generate_series(1, 2)`,
    );
    const res = await create(app, cookie);
    expect(res.status).toBe(503);
    expect((res.body as { error: string }).error).toBe("ai_budget_exhausted");
    expect(calls).toHaveLength(0);
    expect(await planCount()).toBe(0);
    expect((await request(app).get("/api/contracts").set("Cookie", cookie)).status).toBe(200);
  });

  it("stops a chain in the middle at the cap, and removes the plan it had started", async () => {
    const { app, cookie, calls } = await setup([{ status: 429 }, says(CABIN_CHAT_READING)], {
      env: { AI_DAILY_CALLS: "1", AI_GLOBAL_PER_MIN: "100" },
    });
    const res = await create(app, cookie);
    expect(res.status).toBe(503);
    expect(calls).toHaveLength(1);
    expect(await planCount()).toBe(0);
    expect(await usage()).toHaveLength(1);
  });

  it("turns every AI route off with AI_ENABLED=false, and health shows llm false (L6)", async () => {
    const { app, cookie, calls } = await setup([says(CABIN_CHAT_READING)], { env: { AI_ENABLED: "false" } });
    const res = await create(app, cookie);
    expect(res.status).toBe(503);
    expect((res.body as { error: string }).error).toBe("ai_budget_exhausted");
    expect(calls).toHaveLength(0);
    expect((await request(app).get("/api/health")).body).toMatchObject({ llm: false });
  });

  it("answers 500 internal, creates nothing, and calls nothing when no model has a key", async () => {
    const { app, cookie, calls } = await setup([says(CABIN_CHAT_READING)], {
      env: { GEMINI_API_KEY: undefined, GROQ_API_KEY: undefined, OPENROUTER_API_KEY: undefined },
    });
    const res = await create(app, cookie);
    expect(res.status).toBe(500);
    expect(calls).toHaveLength(0);
    expect(await planCount()).toBe(0);
  });

  it("slows everyone down at the global per-minute cap with 429 and Retry-After", async () => {
    const { app, cookie, calls } = await setup([says(CABIN_CHAT_READING)], {
      env: { AI_GLOBAL_PER_MIN: "1" },
    });
    await pools.owner.query(
      `INSERT INTO ai_usage (route, provider, model, ip_hash, input_tokens, output_tokens, succeeded)
       VALUES ('extract', 'groq', 'openai/gpt-oss-120b', 'x', 1, 1, true)`,
    );
    const res = await create(app, cookie);
    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBe("60");
    expect(calls).toHaveLength(0);
  });
});

describe("repeated paste is cached (L5)", () => {
  it("calls the model once, and the second paste is a cache hit that costs nothing", async () => {
    const { app, cookie, calls } = await setup([says(CABIN_CHAT_READING), says(CABIN_CHAT_READING)]);
    const first = await create(app, cookie);
    const second = await create(app, cookie);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((second.body as { extraction: Extraction }).extraction).toEqual(
      (first.body as { extraction: Extraction }).extraction,
    );
    expect(calls).toHaveLength(1);
    expect((await usage()).map((r) => [r["cached"], r["input_tokens"]])).toEqual([
      [false, 120],
      [true, 0],
    ]);
    expect(await planCount()).toBe(2);
  });

  it("still serves a cached reading when the daily budget is used up", async () => {
    const { app, cookie } = await setup([says(CABIN_CHAT_READING)], { env: { AI_DAILY_CALLS: "1" } });
    expect((await create(app, cookie)).status).toBe(200);
    expect((await create(app, cookie)).status).toBe(200);
  });

  it("does not share a reading between different texts", async () => {
    const { app, cookie, calls } = await setup([says(CABIN_CHAT_READING), says(CABIN_CHAT_READING)]);
    await create(app, cookie, CABIN_CHAT);
    await create(app, cookie, `${CABIN_CHAT}\n[Sun 1 Nov, 11:48] Sam Ortiz: ok`);
    expect(calls).toHaveLength(2);
  });
});

describe("request size (L7)", () => {
  it("answers 413 payload_too_large for a body over 32 KB", async () => {
    const { app, cookie, calls } = await setup([says(CABIN_CHAT_READING)]);
    const res = await create(app, cookie, "x".repeat(33_000));
    expect(res.status).toBe(413);
    expect((res.body as { error: string }).error).toBe("payload_too_large");
    expect(calls).toHaveLength(0);
  });
});

describe("checkout limit (L8)", () => {
  it("stops the third checkout from one IP, and PayPal was asked once", async () => {
    const paypal = scriptedPayPal([{ status: 201, body: CREATED_ORDER }]);
    const app = buildApp(pools, {
      env: PAYPAL_KEYS,
      paypalFetch: paypal.fetch,
      limits: { checkout: { limit: 2, windowMs: 600_000 } },
    });
    const { shareIds } = await confirmed(pools.app, await member(pools.app));
    const checkout = () =>
      request(app)
        .post(`/api/shares/${shareIds[0] ?? ""}/checkout`)
        .set("Origin", ORIGIN)
        .send({});

    expect((await checkout()).status).toBe(200);
    expect((await checkout()).status).toBe(200);
    const third = await checkout();
    expect(third.status).toBe(429);
    expect((third.body as { error: string }).error).toBe("rate_limited");
    expect(Number(third.headers["retry-after"])).toBeGreaterThan(0);
    expect(paypal.apiCalls()).toHaveLength(1);
  });
});

describe("contract caps (L9)", () => {
  /** Plans owned by `ownerId`, in `extracting` so no shares are needed. */
  async function seedPlans(ownerId: string, count: number, offset: number): Promise<void> {
    await pools.owner.query(
      `INSERT INTO contracts (id, owner_id, rule_text, rule_hash, reference_at, status, money_source)
       SELECT 'con_' || lpad((g + $3)::text, 22, '0'), $1, 'x', 'h', now(), 'extracting', 'sandbox'
         FROM generate_series(1, $2) AS g`,
      [ownerId, count, offset],
    );
  }

  /** Confirmed plans, inserted directly: the guard triggers are skipped because these rows only need to be counted. */
  async function seedConfirmedPlans(ownerId: string, count: number, offset: number): Promise<void> {
    const client = await pools.owner.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL session_replication_role = replica");
      await client.query(
        `INSERT INTO contracts (id, owner_id, rule_text, rule_hash, reference_at, status, money_source, title,
           currency, total_cents, share_cents, headcount, deadline_at, timezone, demo_now, confirmed_at)
         SELECT 'con_' || lpad((g + $3)::text, 22, '0'), $1, 'x', 'h', now(), 'active', 'sandbox', 'Plan',
           'USD', 16000, 8000, 2, now() + interval '1 day', 'UTC', now(), now()
           FROM generate_series(1, $2) AS g`,
        [ownerId, count, offset],
      );
      await client.query("COMMIT");
    } finally {
      client.release();
    }
  }

  async function guests(n: number): Promise<string[]> {
    const ids = Array.from({ length: n }, (_, i) => `usr_${String(i + 1).padStart(22, "0")}`);
    await pools.owner.query(
      "INSERT INTO users (id, kind, display_name, expires_at) SELECT unnest($1::text[]), 'guest', 'g', now() + interval '1 day'",
      [ids],
    );
    return ids;
  }

  it("refuses a guest's sixth plan with 429 rate_limited, and the stub is not called", async () => {
    const { app, cookie, userId, calls } = await setup([says(CABIN_CHAT_READING)]);
    await seedPlans(userId, MAX_PLANS_PER_GUEST, 0);
    const res = await create(app, cookie);
    expect(res.status).toBe(429);
    expect((res.body as { error: string }).error).toBe("rate_limited");
    expect(calls).toHaveLength(0);
  });

  it("refuses with 429 demo_full when the demo is full of confirmed plans, even for a user with none", async () => {
    const { app, cookie, calls } = await setup([says(CABIN_CHAT_READING)]);
    const owners = await guests(MAX_DEMO_CONTRACTS / 50);
    for (const [i, id] of owners.entries()) await seedConfirmedPlans(id, 50, 10_000 * (i + 1));
    const res = await create(app, cookie);
    expect(res.status).toBe(429);
    expect((res.body as { error: string }).error).toBe("demo_full");
    expect(calls).toHaveLength(0);
  });

  it("does not count drafts toward the demo-wide cap", async () => {
    const { app, cookie } = await setup([says(CABIN_CHAT_READING)]);
    const owners = await guests(MAX_DEMO_CONTRACTS / 50);
    for (const [i, id] of owners.entries()) await seedPlans(id, 50, 10_000 * (i + 1));
    expect((await create(app, cookie)).status).toBe(200);
  });
});

describe("fallback chain through the API (L10)", () => {
  it("uses the next model when one is rate limited, and every attempt has a usage row", async () => {
    const { app, cookie, calls } = await setup([
      { status: 429 },
      { fail: "timeout" },
      says(CABIN_CHAT_READING),
    ]);
    const res = await create(app, cookie);
    expect(res.status).toBe(200);
    expect(calls.map((c) => c.body["model"])).toEqual([
      "gemini-3.8-flash",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
    ]);
    expect((await usage()).map((r) => [r["provider"], r["model"], r["succeeded"]])).toEqual([
      ["gemini", "gemini-3.8-flash", false],
      ["groq", "openai/gpt-oss-120b", false],
      ["groq", "openai/gpt-oss-20b", true],
    ]);
  });

  it("reaches OpenRouter last, and asks the organizer to restate the rule when all four fail", async () => {
    const { app, cookie, calls } = await setup([
      { status: 503 },
      { fail: "network" },
      { status: 429 },
      { status: 500 },
    ]);
    const res = await create(app, cookie);
    expect(res.status).toBe(422);
    expect((res.body as { message: string }).message).toBe(CLARIFY_FALLBACK_QUESTION);
    expect(calls).toHaveLength(4);
    expect((await usage()).map((r) => r["succeeded"])).toEqual([false, false, false, false]);
    expect(await planCount()).toBe(1);
  });
});
