import { PassThrough } from "node:stream";
import type { Express } from "express";
import type { Response } from "supertest";
import { createApp } from "../../src/app";
import { DEFAULT_LIMITS } from "../../src/http/middleware/rateLimit";
import type { Limits } from "../../src/http/middleware/rateLimit";
import { createLogger } from "../../src/observability/logger";
import type { Pools } from "./db";
import { testEnv } from "./env";

/** The origin the test environment allows (CORS_ORIGINS). Every POST in the tests carries it. */
export const ORIGIN = "http://localhost:3000";

const GENEROUS: Limits = {
  api: { limit: 10_000, windowMs: 60_000 },
  login: { limit: 10_000, windowMs: 60_000 },
  signup: { limit: 10_000, windowMs: 60_000 },
  guest: { limit: 10_000, windowMs: 60_000 },
  reset: { limit: 10_000, windowMs: 60_000 },
};

export interface BuildOptions {
  env?: Record<string, string | undefined>;
  /** Override single limits, for the tests that exercise rate limiting. */
  limits?: Partial<Limits>;
  /** Use the real default limits instead of the generous test ones. */
  realLimits?: boolean;
}

export function buildApp(pools: Pools, options: BuildOptions = {}): Express {
  const logger = createLogger({ level: "error", json: true, stream: new PassThrough() });
  const base = options.realLimits ? DEFAULT_LIMITS : GENEROUS;
  return createApp({
    env: testEnv(options.env),
    pool: pools.app,
    logger,
    limits: { ...base, ...options.limits },
  });
}

/** The `fb_session=...` pair from a response's Set-Cookie header, ready to send back as a Cookie header. */
export function sessionCookie(res: Response): string {
  const header = res.headers["set-cookie"] as string[] | string | undefined;
  const all = Array.isArray(header) ? header : header ? [header] : [];
  const found = all.find((c) => c.startsWith("fb_session="));
  if (!found) throw new Error("the response did not set fb_session");
  return found.split(";")[0] ?? "";
}

export function setCookieLine(res: Response): string {
  const header = res.headers["set-cookie"] as string[] | string | undefined;
  const all = Array.isArray(header) ? header : header ? [header] : [];
  return all.find((c) => c.startsWith("fb_session=")) ?? "";
}
