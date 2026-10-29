import type { Response } from "express";
import type { Env } from "../config/env";
import { SESSION_TTL_SECONDS } from "../services/token";

export const SESSION_COOKIE = "fb_session";

function baseOptions(env: Env): {
  httpOnly: true;
  secure: true;
  sameSite: "lax";
  path: string;
  domain?: string;
} {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

/** The session is an httpOnly, Secure, SameSite=Lax cookie. The token is never in the response body. */
export function setSessionCookie(res: Response, token: string, env: Env): void {
  res.cookie(SESSION_COOKIE, token, { ...baseOptions(env), maxAge: SESSION_TTL_SECONDS * 1000 });
}

export function clearSessionCookie(res: Response, env: Env): void {
  res.clearCookie(SESSION_COOKIE, baseOptions(env));
}
