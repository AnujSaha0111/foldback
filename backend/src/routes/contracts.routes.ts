import type { RequestHandler } from "express";
import { Router } from "express";
import type { ContractsController } from "../controllers/contracts.controller";
import { clockSchema } from "../controllers/contracts.schemas";
import type { RulesController } from "../controllers/rules.controller";
import { clarifySchema, confirmSchema, createRuleSchema } from "../controllers/rules.schemas";
import type { Limiters } from "../http/middleware/rateLimit";
import { emptyBodySchema, validateBody } from "../http/middleware/validate";

/** Every contract route needs a signed-in organizer, and the repositories only ever return that organizer's own contracts. */
export function contractsRoutes(
  controller: ContractsController,
  rules: RulesController,
  limiters: Limiters,
  requireUser: RequestHandler,
): Router {
  const router = Router();
  router.use(requireUser);
  router.get("/", controller.list);
  router.get("/:id", controller.read);
  router.get("/:id/scheduler", controller.scheduler);
  // The rule reader calls a model, so these two sit behind the AI limits as well as the per-user plan limit.
  router.post("/", limiters.createContract, ...limiters.ai, validateBody(createRuleSchema), rules.create);
  router.post("/:id/clarify", ...limiters.ai, validateBody(clarifySchema), rules.clarify);
  router.post("/:id/confirm", validateBody(confirmSchema), rules.confirm);
  router.post("/:id/clock", limiters.operator, validateBody(clockSchema), controller.clock);
  router.post("/:id/resolve", limiters.operator, validateBody(emptyBodySchema), controller.resolve);
  return router;
}
