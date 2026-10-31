import { Router } from "express";
import type { SharesController } from "../controllers/shares.controller";

/** The pay link's routes. Public on purpose: a friend has no account, and the unguessable id is the permission. */
export function sharesRoutes(controller: SharesController): Router {
  const router = Router();
  router.get("/:id", controller.read);
  return router;
}
