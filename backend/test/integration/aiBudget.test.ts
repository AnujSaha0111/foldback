import { createAiBudget, hashIp } from "../../src/services/aiBudget.service";
import type { UsageContext } from "../../src/services/aiBudget.service";
import { createPools, prepareDatabase, truncateAll } from "../helpers/db";
import type { Pools } from "../helpers/db";
import { testEnv } from "../helpers/env";

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

const CONTEXT: UsageContext = { route: "extract", userId: null, contractId: null, ipHash: "h".repeat(64) };
const ATTEMPT = {
  provider: "gemini",
  model: "gemini-3.8-flash",
  inputTokens: 100,
  outputTokens: 20,
  succeeded: true,
};

async function rows(): Promise<Record<string, unknown>[]> {
  const result = await pools.owner.query("SELECT * FROM ai_usage ORDER BY id");
  return result.rows as Record<string, unknown>[];
}

/** Puts rows in ai_usage as if earlier attempts happened `agoSeconds` ago. */
async function seed(count: number, options: { agoSeconds?: number; cached?: boolean } = {}): Promise<void> {
  await pools.owner.query(
    `INSERT INTO ai_usage (route, provider, model, ip_hash, input_tokens, output_tokens, succeeded, cached, created_at)
     SELECT 'extract', 'groq', 'openai/gpt-oss-120b', 'x', 1, 1, true, $2, now() - make_interval(secs => $3)
     FROM generate_series(1, $1)`,
    [count, options.cached ?? false, options.agoSeconds ?? 0],
  );
}

describe("allow", () => {
  it("says ok when nothing has been used", async () => {
    expect(await createAiBudget(testEnv(), pools.app).allow()).toBe("ok");
  });

  it("says disabled when the kill switch is off (L6)", async () => {
    expect(await createAiBudget(testEnv({ AI_ENABLED: "false" }), pools.app).allow()).toBe("disabled");
  });

  it("stops at the daily cap, and the attempt that reaches it is the last one allowed (L3)", async () => {
    const budget = createAiBudget(testEnv({ AI_DAILY_CALLS: "3", AI_GLOBAL_PER_MIN: "100" }), pools.app);
    await seed(2, { agoSeconds: 3600 });
    expect(await budget.allow()).toBe("ok");
    await budget.record(CONTEXT, ATTEMPT);
    expect(await budget.allow()).toBe("daily");
  });

  it("does not count cache hits toward the daily cap", async () => {
    const budget = createAiBudget(testEnv({ AI_DAILY_CALLS: "2", AI_GLOBAL_PER_MIN: "100" }), pools.app);
    await seed(5, { cached: true });
    expect(await budget.allow()).toBe("ok");
  });

  it("slows everyone down at the global per-minute cap, then recovers once the minute passes", async () => {
    const budget = createAiBudget(testEnv({ AI_GLOBAL_PER_MIN: "3", AI_DAILY_CALLS: "100" }), pools.app);
    await seed(3, { agoSeconds: 5 });
    expect(await budget.allow()).toBe("busy");
    await pools.owner.query("UPDATE ai_usage SET created_at = now() - interval '2 minutes'");
    expect(await budget.allow()).toBe("ok");
  });

  it("reports the daily cap before the per-minute cap", async () => {
    const budget = createAiBudget(testEnv({ AI_DAILY_CALLS: "1", AI_GLOBAL_PER_MIN: "1" }), pools.app);
    await seed(1);
    expect(await budget.allow()).toBe("daily");
  });
});

describe("record", () => {
  it("writes one row per attempt with the day set by the database", async () => {
    const budget = createAiBudget(testEnv(), pools.app);
    await budget.record(CONTEXT, ATTEMPT);
    await budget.record(CONTEXT, { ...ATTEMPT, model: "gemini-3.6-flash", succeeded: false, inputTokens: 0 });
    const all = await rows();
    expect(all).toHaveLength(2);
    expect(all[0]).toMatchObject({
      route: "extract",
      provider: "gemini",
      model: "gemini-3.8-flash",
      user_id: null,
      contract_id: null,
      ip_hash: "h".repeat(64),
      input_tokens: 100,
      output_tokens: 20,
      succeeded: true,
      cached: false,
    });
    expect(all[1]).toMatchObject({ model: "gemini-3.6-flash", succeeded: false, input_tokens: 0 });
    const today = await pools.owner.query<{ same: boolean }>(
      "SELECT day = (now() AT TIME ZONE 'UTC')::date AS same FROM ai_usage LIMIT 1",
    );
    expect(today.rows[0]?.same).toBe(true);
  });

  it("writes a cache hit with zero tokens, marked cached (L5)", async () => {
    const budget = createAiBudget(testEnv(), pools.app);
    await budget.recordCacheHit(CONTEXT, { provider: "gemini", model: "gemini-3.8-flash" });
    expect((await rows())[0]).toMatchObject({
      cached: true,
      succeeded: true,
      input_tokens: 0,
      output_tokens: 0,
    });
  });

  it("refuses a paid OpenRouter model, because the database enforces the free-only rule", async () => {
    const budget = createAiBudget(testEnv(), pools.app);
    await expect(
      budget.record(CONTEXT, { ...ATTEMPT, provider: "openrouter", model: "openai/gpt-4o" }),
    ).rejects.toMatchObject({ code: "23514" });
    await budget.record(CONTEXT, { ...ATTEMPT, provider: "openrouter", model: "openrouter/free" });
    await budget.record(CONTEXT, { ...ATTEMPT, provider: "openrouter", model: "vendor/model:free" });
    expect(await rows()).toHaveLength(2);
  });
});

describe("hashIp", () => {
  it("is stable, keyed, and never contains the address", () => {
    const env = testEnv();
    const hash = hashIp(env, "203.0.113.9");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp(env, "203.0.113.9")).toBe(hash);
    expect(hashIp(env, "203.0.113.10")).not.toBe(hash);
    expect(hash).not.toContain("203");
    expect(hashIp(testEnv({ IP_HASH_SALT: "another-salt-another-salt" }), "203.0.113.9")).not.toBe(hash);
    expect(hashIp(testEnv({ JWT_SECRET: "x".repeat(40) }), "203.0.113.9")).not.toBe(hash);
  });
});
