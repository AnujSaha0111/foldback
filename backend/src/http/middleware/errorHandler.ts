import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import type { Logger } from "../../observability/logger";
import { AppError } from "../errors";

interface BodyParserError extends Error {
  type?: string;
}

const DOWN_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND"]);

/** Postgres is unreachable or shutting down (SQLSTATE 08 or 57P): a retryable 503, not a bug. */
function databaseDown(err: unknown): boolean {
  const { code, message } = (err ?? {}) as { code?: unknown; message?: unknown };
  const c = typeof code === "string" ? code : "";
  if (DOWN_CODES.has(c) || c.startsWith("08") || c.startsWith("57P")) return true;
  return typeof message === "string" && message.includes("timeout exceeded when trying to connect");
}

/** Turns anything thrown into the API's error JSON. Only AppError messages reach the client. */
function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) {
    return new AppError(
      "bad_request",
      "The request is not valid.",
      err.issues.map((i) => i.path.join(".")),
    );
  }
  const type = (err as BodyParserError | undefined)?.type;
  if (type === "entity.too.large") return new AppError("payload_too_large", "The request body is too large.");
  if (type === "entity.parse.failed")
    return new AppError("bad_request", "The request body is not valid JSON.");
  if (databaseDown(err)) {
    return new AppError("unavailable", "Foldback is temporarily unavailable.", undefined, {
      "Retry-After": "30",
    });
  }
  return new AppError("internal", "Something went wrong on our side.");
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError("not_found", "That route does not exist."));
};

export function errorHandler(logger: Logger): ErrorRequestHandler {
  const log = logger.child({ module: "errors" });
  return (err: unknown, _req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const appError = toAppError(err);
    if (appError.code === "unavailable") log.warn("database unavailable", { err });
    else if (appError.status >= 500) log.error("unhandled error", { err });
    for (const [name, value] of Object.entries(appError.headers)) res.setHeader(name, value);
    const body: Record<string, unknown> = {
      error: appError.code,
      message: appError.message,
      request_id: res.locals["requestId"] as string | undefined,
    };
    if (appError.details !== undefined) body["details"] = appError.details;
    Object.assign(body, appError.body);
    res.status(appError.status).json(body);
  };
}
