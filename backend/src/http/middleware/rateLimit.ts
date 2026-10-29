import type { Request, RequestHandler, Response } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
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
}

/** The limits in docs/spec/architecture.md. Tests pass larger ones so they can sign up many times. */
export const DEFAULT_LIMITS: Limits = {
  api: { limit: 120, windowMs: 60_000 },
  login: { limit: 10, windowMs: 15 * 60_000 },
  signup: { limit: 5, windowMs: 60 * 60_000 },
  guest: { limit: 5, windowMs: 24 * 60 * 60_000 },
  reset: { limit: 5, windowMs: 60 * 60_000 },
};

export interface Limiters {
  api: RequestHandler;
  login: RequestHandler;
  signup: RequestHandler;
  guest: RequestHandler;
  reset: RequestHandler;
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
  };
}
