import { PassThrough } from "node:stream";
import type { Express } from "express";
import type { Response } from "supertest";
import { createApp } from "../../src/app";
import { DEFAULT_LIMITS } from "../../src/http/middleware/rateLimit";
import type { Limits } from "../../src/http/middleware/rateLimit";
import { createLogger } from "../../src/observability/logger";
import type { Notifier } from "../../src/realtime/notify";
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
  aiUserMinute: { limit: 10_000, windowMs: 60_000 },
  aiUserDay: { limit: 10_000, windowMs: 60_000 },
  aiIpMinute: { limit: 10_000, windowMs: 60_000 },
  aiIpDay: { limit: 10_000, windowMs: 60_000 },
  createContract: { limit: 10_000, windowMs: 60_000 },
  checkout: { limit: 10_000, windowMs: 60_000 },
  authorize: { limit: 10_000, windowMs: 60_000 },
  operator: { limit: 10_000, windowMs: 60_000 },
};

/** A notifier that remembers what it was told, so tests can check that events fire after a commit and only then. */
export function recordingNotifier(): Notifier & { contractEvents: [string, number][] } {
  const contractEvents: [string, number][] = [];
  return {
    contractEvents,
    contractChanged: (contractId, version) => {
      contractEvents.push([contractId, version]);
    },
    shareChanged: () => undefined,
  };
}

export interface BuildOptions {
  env?: Record<string, string | undefined>;
  /** Override single limits, for the tests that exercise rate limiting. */
  limits?: Partial<Limits>;
  /** Use the real default limits instead of the generous test ones. */
  realLimits?: boolean;
  /** Model calls go here instead of the network. */
  llmFetch?: typeof fetch;
  /** PayPal calls go here instead of the network. */
  paypalFetch?: typeof fetch;
  notifier?: Notifier;
  /** "Now" for pasted text. */
  now?: () => Date;
}

export function buildApp(pools: Pools, options: BuildOptions = {}): Express {
  const logger = createLogger({ level: "error", json: true, stream: new PassThrough() });
  const base = options.realLimits ? DEFAULT_LIMITS : GENEROUS;
  return createApp({
    env: testEnv(options.env),
    pool: pools.app,
    logger,
    limits: { ...base, ...options.limits },
    notifier: options.notifier ?? recordingNotifier(),
    ...(options.llmFetch ? { llmFetch: options.llmFetch } : {}),
    ...(options.paypalFetch ? { paypalFetch: options.paypalFetch } : {}),
    ...(options.now ? { now: options.now } : {}),
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
