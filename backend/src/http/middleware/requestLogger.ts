import type { RequestHandler } from "express";
import type { Logger } from "../../observability/logger";

/** A share or contract id in a path. A pay-link id is the permission to pay, so it never reaches a log line. */
const ID_IN_PATH = /\b(?:shr|con)_[A-Za-z0-9_-]{22}\b/g;

/** One log line per request, written when the response finishes. Ids are masked and the query string is never logged. */
export function requestLogger(logger: Logger): RequestHandler {
  const log = logger.child({ module: "http" });
  return (req, res, next) => {
    const started = process.hrtime.bigint();
    res.on("finish", () => {
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      const path = req.path.replace(ID_IN_PATH, ":id");
      log.info("request", { method: req.method, path, status: res.statusCode, ms: Math.round(ms) });
    });
    next();
  };
}
