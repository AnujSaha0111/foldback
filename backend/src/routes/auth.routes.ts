import type { RequestHandler } from "express";
import { Router } from "express";
import { loginSchema, signupSchema } from "../controllers/auth.schemas";
import type { AuthController } from "../controllers/auth.controller";
import { emptyBodySchema, validateBody } from "../http/middleware/validate";
import type { Limiters } from "../http/middleware/rateLimit";

/** Paths and middleware only. `requireUser` is passed in so the routes stay free of config and the database. */
export function authRoutes(
  controller: AuthController,
  limiters: Limiters,
  requireUser: RequestHandler,
): Router {
  const router = Router();
  router.post("/signup", limiters.signup, validateBody(signupSchema), controller.signup);
  router.post("/login", limiters.login, validateBody(loginSchema), controller.login);
  router.post("/guest", limiters.guest, validateBody(emptyBodySchema), controller.guest);
  router.post("/logout", validateBody(emptyBodySchema), controller.logout);
  router.get("/me", requireUser, controller.me);
  return router;
}
