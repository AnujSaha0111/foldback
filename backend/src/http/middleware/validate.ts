import type { RequestHandler } from "express";
import { z } from "zod";

/** For routes that take no body. Any field at all is refused. */
export const emptyBodySchema = z.strictObject({});

/** Validates the JSON body against a zod schema (use `z.strictObject` so unknown keys are refused). */
export function validateBody<S extends z.ZodType>(schema: S): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}
