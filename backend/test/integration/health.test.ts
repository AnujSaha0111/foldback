import { PassThrough } from "node:stream";
import { Pool } from "pg";
import request from "supertest";
import { createApp } from "../../src/app";
import { createLogger } from "../../src/observability/logger";
import { createPools, prepareDatabase } from "../helpers/db";
import type { Pools } from "../helpers/db";
import { testEnv } from "../helpers/env";

const logger = createLogger({ level: "error", json: true, stream: new PassThrough() });
let pools: Pools;

beforeAll(async () => {
  pools = createPools();
  await prepareDatabase(pools.owner);
});

afterAll(async () => {
  await pools.app.end();
  await pools.owner.end();
});

describe("health (test 16)", () => {
  it("live is 200 without touching the database", async () => {
    const dead = new Pool({
      connectionString: "postgres://x:x@127.0.0.1:1/none",
      connectionTimeoutMillis: 300,
    });
    const res = await request(createApp({ env: testEnv(), pool: dead, logger })).get("/health/live");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    await dead.end();
  });

  it("ready is 200 when the database answers and migrations are current", async () => {
    const res = await request(createApp({ env: testEnv(), pool: pools.app, logger })).get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("ready is 503 when the pool points at a dead port", async () => {
    const dead = new Pool({
      connectionString: "postgres://x:x@127.0.0.1:1/none",
      connectionTimeoutMillis: 300,
    });
    const res = await request(createApp({ env: testEnv(), pool: dead, logger })).get("/health/ready");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "unavailable" });
    await dead.end();
  });

  it("/api/health reports the version, sandbox, and the AI calls left", async () => {
    const env = testEnv({ GIT_SHA: "abc1234", AI_DAILY_CALLS: "600", GROQ_API_KEY: "gsk_test" });
    const res = await request(createApp({ env, pool: pools.app, logger })).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      service: "foldback",
      version: "abc1234",
      paypal_env: "sandbox",
      llm: true,
      ai_calls_left: 600,
    });
  });

  it("llm is false when AI_ENABLED=false or no key is set", async () => {
    const off = await request(
      createApp({ env: testEnv({ AI_ENABLED: "false", GROQ_API_KEY: "k" }), pool: pools.app, logger }),
    ).get("/api/health");
    const noKey = await request(createApp({ env: testEnv(), pool: pools.app, logger })).get("/api/health");
    expect((off.body as { llm: boolean }).llm).toBe(false);
    expect((noKey.body as { llm: boolean }).llm).toBe(false);
  });
});

describe("request handling", () => {
  const app = (): ReturnType<typeof createApp> => createApp({ env: testEnv(), pool: pools.app, logger });

  it("echoes a sane X-Request-Id and replaces a bad one", async () => {
    const kept = await request(app()).get("/health/live").set("X-Request-Id", "proxy-id-12345");
    expect(kept.headers["x-request-id"]).toBe("proxy-id-12345");
    const replaced = await request(app()).get("/health/live").set("X-Request-Id", "bad id!");
    expect(replaced.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns the error JSON for an unknown route", async () => {
    const res = await request(app()).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: "not_found" });
    expect(typeof (res.body as { request_id: unknown }).request_id).toBe("string");
  });

  it("rejects a body over 32 KB with payload_too_large", async () => {
    const res = await request(app())
      .post("/api/health")
      .send({ blob: "x".repeat(40_000) });
    expect(res.status).toBe(413);
    expect((res.body as { error: string }).error).toBe("payload_too_large");
  });

  it("rejects malformed JSON with bad_request", async () => {
    const res = await request(app())
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toBe("bad_request");
  });

  it("sets helmet headers and hides x-powered-by", async () => {
    const res = await request(app()).get("/health/live");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});
