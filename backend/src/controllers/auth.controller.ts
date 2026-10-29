import type { RequestHandler, Response } from "express";
import type { Pool } from "pg";
import type { Env } from "../config/env";
import { clearSessionCookie, setSessionCookie } from "../http/cookies";
import { currentUser } from "../http/middleware/auth";
import type { User } from "../repositories/users.repo";
import { createGuest, login, signup } from "../services/auth.service";
import type { AuthResult } from "../services/auth.service";
import type { ApiUser } from "../shared/api-types";
import type { LoginInput, SignupInput } from "./auth.schemas";

export interface AuthController {
  signup: RequestHandler;
  login: RequestHandler;
  guest: RequestHandler;
  logout: RequestHandler;
  me: RequestHandler;
}

/** The only shape of a user the API returns. It never contains a hash. */
export function toApiUser(user: User): ApiUser {
  return {
    id: user.id,
    kind: user.kind,
    email: user.email,
    display_name: user.displayName,
    expires_at: user.expiresAt ? user.expiresAt.toISOString() : null,
  };
}

export function createAuthController(env: Env, pool: Pool): AuthController {
  const start = (res: Response, result: AuthResult, status: number): void => {
    setSessionCookie(res, result.token, env);
    res.status(status).json({ user: toApiUser(result.user) });
  };
  return {
    signup: async (req, res) => {
      const body = req.body as SignupInput;
      start(
        res,
        await signup(pool, env, {
          email: body.email,
          password: body.password,
          displayName: body.display_name,
        }),
        201,
      );
    },
    login: async (req, res) => {
      const body = req.body as LoginInput;
      start(res, await login(pool, env, body), 200);
    },
    guest: async (_req, res) => {
      start(res, await createGuest(pool, env), 201);
    },
    logout: (_req, res) => {
      clearSessionCookie(res, env);
      res.status(204).end();
    },
    me: (_req, res) => {
      res.json({ user: toApiUser(currentUser(res)) });
    },
  };
}
