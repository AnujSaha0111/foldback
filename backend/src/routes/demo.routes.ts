import type { RequestHandler } from "express";
import { Router } from "express";
import type { DemoController } from "../controllers/demo.controller";
import type { Limiters } from "../http/middleware/rateLimit";
import { emptyBodySchema, validateBody } from "../http/middleware/validate";

export function demoRoutes(
  controller: DemoController,
  limiters: Limiters,
  requireUser: RequestHandler,
): Router {
  const router = Router();
  router.post("/reset", requireUser, limiters.reset, validateBody(emptyBodySchema), controller.reset);
  return router;
}
