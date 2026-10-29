import type { Request, RequestHandler, Response } from "express";
import type { Pool } from "pg";
import type { Env } from "../../config/env";
import { setContextUser } from "../../observability/requestContext";
import type { User } from "../../repositories/users.repo";
import { userFromToken } from "../../services/session";
import { SESSION_COOKIE } from "../cookies";
import { AppError } from "../errors";

function tokenOf(req: Request): string | null {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const token = cookies?.[SESSION_COOKIE];
  return typeof token === "string" ? token : null;
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
    const user = await userFromToken(tokenOf(req), pool, env);
    if (!user) throw new AppError("unauthenticated", "Sign in to continue.");
    res.locals["user"] = user;
    setContextUser(user.id);
    next();
  };
}
