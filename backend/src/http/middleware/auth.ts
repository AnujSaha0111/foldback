import type { Request, RequestHandler, Response } from "express";
import type { Pool } from "pg";
import type { Env } from "../../config/env";
import { setContextUser } from "../../observability/requestContext";
import { findById } from "../../repositories/users.repo";
import type { User } from "../../repositories/users.repo";
import { verifySession } from "../../services/token";
import { SESSION_COOKIE } from "../cookies";
import { AppError } from "../errors";

async function resolveUser(req: Request, pool: Pool, env: Env): Promise<User | null> {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const token = cookies?.[SESSION_COOKIE];
  if (typeof token !== "string") return null;
  const claims = verifySession(token, env.JWT_SECRET);
  if (!claims) return null;
  const user = await findById(pool, claims.sub);
  if (!user) return null;
  // An expired guest is signed out even though the token itself is still valid.
  if (user.kind === "guest" && user.expiresAt !== null && user.expiresAt.getTime() <= Date.now()) return null;
  return user;
}

/** The signed-in user for this request. Only call it after `requireUser`. */
export function currentUser(res: Response): User {
  const user = res.locals["user"] as User | undefined;
  if (!user) throw new AppError("unauthenticated", "Sign in to continue.");
  return user;
}

/** Guard for organizer routes. The cookie must hold a valid token for a user who still exists. */
export function requireUser(pool: Pool, env: Env): RequestHandler {
  return async (req, res, next) => {
    const user = await resolveUser(req, pool, env);
    if (!user) throw new AppError("unauthenticated", "Sign in to continue.");
    res.locals["user"] = user;
    setContextUser(user.id);
    next();
  };
}
