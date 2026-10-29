import jwt from "jsonwebtoken";
import { z } from "zod";

export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const claimsSchema = z.object({
  sub: z.string().regex(/^usr_[A-Za-z0-9_-]{22}$/),
  kind: z.enum(["member", "guest"]),
});

export type SessionClaims = z.infer<typeof claimsSchema>;

/** The value of the fb_session cookie: HS256, 7 days, claims `sub` (user id) and `kind`. */
export function signSession(
  claims: SessionClaims,
  secret: string,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): string {
  return jwt.sign({ kind: claims.kind }, secret, {
    algorithm: "HS256",
    subject: claims.sub,
    expiresIn: ttlSeconds,
  });
}

/**
 * Returns the claims of a valid token, or null for anything else: a bad signature, an expired token, a token
 * signed with another algorithm (including "none"), or claims of the wrong shape. It never throws.
 */
export function verifySession(token: string, secret: string): SessionClaims | null {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (typeof payload === "string") return null;
    const parsed = claimsSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
