import { Router } from "express";
import type { HealthController } from "../controllers/health.controller";

/** Probe routes live outside /api so Compose and Caddy can reach them without the API's rules. */
export function healthRoutes(controller: HealthController): Router {
  const router = Router();
  router.get("/health/live", controller.live);
  router.get("/health/ready", controller.ready);
  router.get("/api/health", controller.summary);
  return router;
}
