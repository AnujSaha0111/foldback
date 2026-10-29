import type { RequestHandler } from "express";
import { AppError } from "../errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * CSRF defence next to SameSite=Lax: every non-GET request must come from an allowed origin. The browser sets
 * `Origin` itself (or `Referer` on older paths), and a page on another site cannot forge either.
 */
export function originCheck(allowedOrigins: string[]): RequestHandler {
  const allowed = new Set(allowedOrigins.map((o) => originOf(o)).filter((o): o is string => o !== null));
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }
    // When the browser sends Origin it is authoritative, even if it is "null". Referer is only a fallback for
    // requests that carry no Origin at all.
    const originHeader = req.header("origin");
    const origin = originHeader !== undefined ? originOf(originHeader) : originOf(req.header("referer"));
    if (origin !== null && allowed.has(origin)) {
      next();
      return;
    }
    next(new AppError("bad_origin", "This request did not come from the app."));
  };
}
