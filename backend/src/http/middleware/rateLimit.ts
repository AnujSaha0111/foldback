import type { Request, RequestHandler, Response } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { Env } from "../../config/env";
import { AppError } from "../errors";
import { currentUser } from "./auth";

interface LimitRule {
  limit: number;
  windowMs: number;
}

export interface Limits {
  api: LimitRule;
  login: LimitRule;
  signup: LimitRule;
  guest: LimitRule;
  reset: LimitRule;
  /** AI requests (rule reader and agent), per signed-in user and per IP. See docs/spec/ai.md. */
  aiUserMinute: LimitRule;
  aiUserDay: LimitRule;
  aiIpMinute: LimitRule;
  aiIpDay: LimitRule;
  /** New plans per user (architecture.md). */
  createContract: LimitRule;
  /** Pay-link checkouts per IP (architecture.md). */
  checkout: LimitRule;
  /** Authorize and sync per IP, counted together (architecture.md). */
  authorize: LimitRule;
  /** Clock and resolve, per user (architecture.md). */
  operator: LimitRule;
  /** Assistant turns per plan per day (ai.md). */
  agentContract: LimitRule;
}

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** The limits in docs/spec/architecture.md. Tests pass larger ones so they can sign up many times. */
export const DEFAULT_LIMITS: Limits = {
  api: { limit: 120, windowMs: 60_000 },
  login: { limit: 10, windowMs: 15 * 60_000 },
  signup: { limit: 5, windowMs: 60 * 60_000 },
  guest: { limit: 5, windowMs: 24 * 60 * 60_000 },
  reset: { limit: 5, windowMs: 60 * 60_000 },
  aiUserMinute: { limit: 6, windowMs: MINUTE_MS },
  aiUserDay: { limit: 30, windowMs: DAY_MS },
  aiIpMinute: { limit: 10, windowMs: MINUTE_MS },
  aiIpDay: { limit: 60, windowMs: DAY_MS },
  createContract: { limit: 15, windowMs: DAY_MS },
  checkout: { limit: 10, windowMs: 10 * MINUTE_MS },
  authorize: { limit: 20, windowMs: 10 * MINUTE_MS },
  operator: { limit: 30, windowMs: MINUTE_MS },
  agentContract: { limit: 25, windowMs: DAY_MS },
};

/** The defaults, with the AI limits the operator set in the environment. */
export function limitsFromEnv(env: Env): Limits {
  return {
    ...DEFAULT_LIMITS,
    aiUserMinute: { limit: env.AI_USER_PER_MIN, windowMs: MINUTE_MS },
    aiUserDay: { limit: env.AI_USER_PER_DAY, windowMs: DAY_MS },
    aiIpMinute: { limit: env.AI_IP_PER_MIN, windowMs: MINUTE_MS },
    aiIpDay: { limit: env.AI_IP_PER_DAY, windowMs: DAY_MS },
    agentContract: { limit: env.AGENT_PER_CONTRACT_PER_DAY, windowMs: DAY_MS },
  };
}

export interface Limiters {
  api: RequestHandler;
  login: RequestHandler;
  signup: RequestHandler;
  guest: RequestHandler;
  reset: RequestHandler;
  /** Four limiters, in order. Put them after the sign-in guard on every route that calls a model. */
  ai: RequestHandler[];
  createContract: RequestHandler;
  checkout: RequestHandler;
  authorize: RequestHandler;
  operator: RequestHandler;
  agentContract: RequestHandler;
}

const ipKey = (req: Request): string => ipKeyGenerator(req.ip ?? "unknown");

function make(rule: LimitRule, key: (req: Request, res: Response) => string): RequestHandler {
  return rateLimit({
    windowMs: rule.windowMs,
    limit: rule.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: key,
    handler: (req, _res, next) => {
      const resetTime = (req as { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
      const seconds = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : Math.ceil(rule.windowMs / 1000);
      next(
        new AppError("rate_limited", "Too many requests. Try again later.", undefined, {
          "Retry-After": String(seconds),
        }),
      );
    },
  });
}

/** In-memory counters (one process). Keys are the user id when signed in, otherwise the IP. */
export function createLimiters(limits: Limits = DEFAULT_LIMITS): Limiters {
  return {
    api: make(limits.api, ipKey),
    login: make(limits.login, (req) => {
      const body = req.body as { email?: unknown } | undefined;
      const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      return `${ipKey(req)}|${email}`;
    }),
    signup: make(limits.signup, ipKey),
    guest: make(limits.guest, ipKey),
    reset: make(limits.reset, (_req, res) => currentUser(res).id),
    createContract: make(limits.createContract, (_req, res) => `create|${currentUser(res).id}`),
    checkout: make(limits.checkout, (req) => `checkout|${ipKey(req)}`),
    authorize: make(limits.authorize, (req) => `authorize|${ipKey(req)}`),
    operator: make(limits.operator, (_req, res) => `operator|${currentUser(res).id}`),
    agentContract: make(limits.agentContract, (req) => `agent|${String(req.params["id"])}`),
    ai: [
      make(limits.aiUserMinute, (_req, res) => `user-min|${currentUser(res).id}`),
      make(limits.aiUserDay, (_req, res) => `user-day|${currentUser(res).id}`),
      make(limits.aiIpMinute, (req) => `ip-min|${ipKey(req)}`),
      make(limits.aiIpDay, (req) => `ip-day|${ipKey(req)}`),
    ],
  };
}
