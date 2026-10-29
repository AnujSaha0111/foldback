import type { RequestHandler } from "express";
import type { Logger } from "../../observability/logger";

/** One log line per request, written when the response finishes. The query string is never logged. */
export function requestLogger(logger: Logger): RequestHandler {
  const log = logger.child({ module: "http" });
  return (req, res, next) => {
    const started = process.hrtime.bigint();
    res.on("finish", () => {
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      log.info("request", { method: req.method, path: req.path, status: res.statusCode, ms: Math.round(ms) });
    });
    next();
  };
}
