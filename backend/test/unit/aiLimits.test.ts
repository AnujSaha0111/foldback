import express from "express";
import type { Express } from "express";
import request from "supertest";
import { errorHandler } from "../../src/http/middleware/errorHandler";
import { createLimiters, DEFAULT_LIMITS, limitsFromEnv } from "../../src/http/middleware/rateLimit";
import type { Limits } from "../../src/http/middleware/rateLimit";
import { createLogger } from "../../src/observability/logger";
import { PassThrough } from "node:stream";
import { testEnv } from "../helpers/env";

const BIG = { limit: 1000, windowMs: 60_000 };

/** A tiny app: the user is whoever the x-user header names, then the four AI limiters, then a handler. */
function appWith(overrides: Partial<Limits>): Express {
  const limiters = createLimiters({
    ...DEFAULT_LIMITS,
    aiUserMinute: BIG,
    aiUserDay: BIG,
    aiIpMinute: BIG,
    aiIpDay: BIG,
    ...overrides,
  });
  const app = express();
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    res.locals["user"] = { id: req.header("x-user") ?? "usr_a" };
    next();
  });
  app.post("/ai", ...limiters.ai, (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler(createLogger({ level: "error", json: true, stream: new PassThrough() })));
  return app;
}

const post = (app: Express, user: string, ip = "198.51.100.1") =>
  request(app).post("/ai").set("x-user", user).set("X-Forwarded-For", ip);

describe("AI limits", () => {
  it("stops one user after the per-minute limit, with Retry-After (L2)", async () => {
    const app = appWith({ aiUserMinute: { limit: 2, windowMs: 60_000 } });
    expect((await post(app, "usr_a")).status).toBe(200);
    expect((await post(app, "usr_a")).status).toBe(200);
    const third = await post(app, "usr_a");
    expect(third.status).toBe(429);
    expect((third.body as { error: string }).error).toBe("rate_limited");
    expect(Number(third.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("counts users separately", async () => {
    const app = appWith({ aiUserMinute: { limit: 1, windowMs: 60_000 } });
    expect((await post(app, "usr_a")).status).toBe(200);
    expect((await post(app, "usr_b")).status).toBe(200);
    expect((await post(app, "usr_a")).status).toBe(429);
  });

  it("stops many guest accounts coming from one address", async () => {
    const app = appWith({ aiIpMinute: { limit: 2, windowMs: 60_000 } });
    expect((await post(app, "usr_a")).status).toBe(200);
    expect((await post(app, "usr_b")).status).toBe(200);
    expect((await post(app, "usr_c")).status).toBe(429);
    expect((await post(app, "usr_c", "198.51.100.2")).status).toBe(200);
  });

  it("has a daily limit per user and per address as well", async () => {
    const perUser = appWith({ aiUserDay: { limit: 1, windowMs: 86_400_000 } });
    expect((await post(perUser, "usr_a")).status).toBe(200);
    expect((await post(perUser, "usr_a")).status).toBe(429);
    const perIp = appWith({ aiIpDay: { limit: 1, windowMs: 86_400_000 } });
    expect((await post(perIp, "usr_a")).status).toBe(200);
    expect((await post(perIp, "usr_b")).status).toBe(429);
  });
});

describe("limitsFromEnv", () => {
  it("uses the documented defaults", () => {
    const limits = limitsFromEnv(testEnv());
    expect(limits.aiUserMinute).toEqual({ limit: 6, windowMs: 60_000 });
    expect(limits.aiUserDay).toEqual({ limit: 30, windowMs: 86_400_000 });
    expect(limits.aiIpMinute).toEqual({ limit: 10, windowMs: 60_000 });
    expect(limits.aiIpDay).toEqual({ limit: 60, windowMs: 86_400_000 });
    expect(limits.login).toEqual(DEFAULT_LIMITS.login);
  });

  it("takes the limits the operator set", () => {
    const limits = limitsFromEnv(
      testEnv({ AI_USER_PER_MIN: "2", AI_USER_PER_DAY: "3", AI_IP_PER_MIN: "4", AI_IP_PER_DAY: "5" }),
    );
    expect([
      limits.aiUserMinute.limit,
      limits.aiUserDay.limit,
      limits.aiIpMinute.limit,
      limits.aiIpDay.limit,
    ]).toEqual([2, 3, 4, 5]);
  });
});
