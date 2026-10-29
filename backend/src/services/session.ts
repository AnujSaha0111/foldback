import type { Pool } from "pg";
import type { Env } from "../config/env";
import { findById } from "../repositories/users.repo";
import type { User } from "../repositories/users.repo";
import { verifySession } from "./token";

/**
 * The user behind a session token, or null. Used by both the HTTP guard and the socket handshake, so the two can
 * never disagree about who is signed in: a bad signature, an unknown user, or an expired guest all give null.
 */
export async function userFromToken(token: string | null, pool: Pool, env: Env): Promise<User | null> {
  if (token === null) return null;
  const claims = verifySession(token, env.JWT_SECRET);
  if (!claims) return null;
  const user = await findById(pool, claims.sub);
  if (!user) return null;
  if (user.kind === "guest" && user.expiresAt !== null && user.expiresAt.getTime() <= Date.now()) return null;
  return user;
}
