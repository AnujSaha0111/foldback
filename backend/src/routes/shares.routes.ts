import { Router } from "express";
import type { SharesController } from "../controllers/shares.controller";
import type { Limiters } from "../http/middleware/rateLimit";
import { emptyBodySchema, validateBody } from "../http/middleware/validate";

/** The pay link's routes. Public on purpose: a friend has no account, and the unguessable id is the permission. */
export function sharesRoutes(controller: SharesController, limiters: Limiters): Router {
  const router = Router();
  router.get("/:id", controller.read);
  router.post("/:id/checkout", limiters.checkout, validateBody(emptyBodySchema), controller.checkout);
  return router;
}
