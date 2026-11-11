import { randomInt } from "node:crypto";
import type { Pool } from "pg";
import type { Env } from "../config/env";
import { newId } from "../db/ids";
import { withTransaction } from "../db/tx";
import { AppError } from "../http/errors";
import {
  countRecentGuests,
  findCredentialsByEmail,
  insertGuest,
  insertMember,
  touchLastLogin,
} from "../repositories/users.repo";
import type { User } from "../repositories/users.repo";
import { hashPassword, verifyPassword } from "./password";
import { seedUser } from "./seed.service";
import { MAX_GUESTS_PER_DAY } from "../shared/rules";
import { signSession } from "./token";

const GUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthResult {
  user: User;
  /** The value for the fb_session cookie. */
  token: string;
}

function session(user: User, env: Env): AuthResult {
  return { user, token: signSession({ sub: user.id, kind: user.kind }, env.JWT_SECRET) };
}

export async function signup(
  pool: Pool,
  env: Env,
  input: { email: string; password: string; displayName: string },
): Promise<AuthResult> {
  if (!env.SIGNUPS_ENABLED) throw new AppError("signups_disabled", "Sign-ups are turned off right now.");
  // Hash before touching the database, so a taken email costs the same time as a new one.
  const passwordHash = await hashPassword(input.password);
  const user = await withTransaction(pool, async (client) => {
    const created = await insertMember(client, {
      id: newId("usr"),
      email: input.email,
      passwordHash,
      displayName: input.displayName,
    });
    if (created) await seedUser(client, created.id);
    return created;
  });
  if (!user) throw new AppError("email_taken", "An account with that email already exists.");
  return session(user, env);
}

export async function login(
  pool: Pool,
  env: Env,
  input: { email: string; password: string },
): Promise<AuthResult> {
  const credentials = await findCredentialsByEmail(pool, input.email);
  // An unknown email still runs one full bcrypt comparison, so both failures look and feel the same.
  const ok = await verifyPassword(input.password, credentials?.passwordHash ?? null);
  if (!credentials || !ok) throw new AppError("invalid_credentials", "Email or password is incorrect.");
  await touchLastLogin(pool, credentials.user.id);
  return session(credentials.user, env);
}

export async function createGuest(pool: Pool, env: Env): Promise<AuthResult> {
  if ((await countRecentGuests(pool)) >= MAX_GUESTS_PER_DAY) {
    throw new AppError("rate_limited", "The demo is busy right now. Try again in an hour.", undefined, {
      "Retry-After": "3600",
    });
  }
  const user = await withTransaction(pool, async (client) => {
    const guest = await insertGuest(client, {
      id: newId("usr"),
      displayName: `Guest ${randomInt(1000, 10_000)}`,
      expiresAt: new Date(Date.now() + GUEST_TTL_MS),
    });
    await seedUser(client, guest.id);
    return guest;
  });
  return session(user, env);
}
