import { Router } from "express";
import type { SharesController } from "../controllers/shares.controller";
import { authorizeSchema, syncSchema } from "../controllers/shares.schemas";
import type { Limiters } from "../http/middleware/rateLimit";
import { emptyBodySchema, validateBody } from "../http/middleware/validate";

/** The pay link's routes. Public on purpose: a friend has no account, and the unguessable id is the permission. */
export function sharesRoutes(controller: SharesController, limiters: Limiters): Router {
  const router = Router();
  router.get("/:id", controller.read);
  router.post("/:id/checkout", limiters.checkout, validateBody(emptyBodySchema), controller.checkout);
  router.post("/:id/authorize", limiters.authorize, validateBody(authorizeSchema), controller.authorize);
  router.post("/:id/sync", limiters.authorize, validateBody(syncSchema), controller.sync);
  return router;
}
