import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { runWithContext } from "../../observability/requestContext";

const ACCEPTED = /^[A-Za-z0-9._-]{8,64}$/;

/** Accepts X-Request-Id from the proxy when it looks sane, otherwise makes one. Echoes it on the response. */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header("x-request-id");
  const id = incoming && ACCEPTED.test(incoming) ? incoming : randomUUID();
  res.setHeader("X-Request-Id", id);
  res.locals["requestId"] = id;
  runWithContext({ requestId: id }, next);
};
