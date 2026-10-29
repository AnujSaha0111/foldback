import type { RequestHandler } from "express";
import { Router } from "express";
import type { ContractsController } from "../controllers/contracts.controller";

/** Every contract route needs a signed-in organizer, and the repositories only ever return that organizer's own contracts. */
export function contractsRoutes(controller: ContractsController, requireUser: RequestHandler): Router {
  const router = Router();
  router.use(requireUser);
  router.get("/", controller.list);
  router.get("/:id", controller.read);
  return router;
}
