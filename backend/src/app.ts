import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { Express } from "express";
import helmet from "helmet";
import type { Pool } from "pg";
import type { Env } from "./config/env";
import { createAuthController } from "./controllers/auth.controller";
import { createContractsController } from "./controllers/contracts.controller";
import { createDemoController } from "./controllers/demo.controller";
import { createHealthController } from "./controllers/health.controller";
import { requireUser } from "./http/middleware/auth";
import { errorHandler, notFoundHandler } from "./http/middleware/errorHandler";
import { originCheck } from "./http/middleware/originCheck";
import { createLimiters, limitsFromEnv } from "./http/middleware/rateLimit";
import type { Limits } from "./http/middleware/rateLimit";
import { requestId } from "./http/middleware/requestId";
import { requestLogger } from "./http/middleware/requestLogger";
import type { Logger } from "./observability/logger";
import { authRoutes } from "./routes/auth.routes";
import { contractsRoutes } from "./routes/contracts.routes";
import { demoRoutes } from "./routes/demo.routes";
import { healthRoutes } from "./routes/health.routes";

export interface AppDeps {
  env: Env;
  pool: Pool;
  logger: Logger;
  /** Rate limits. Tests pass larger ones; production uses the defaults from architecture.md. */
  limits?: Limits;
}

/** Builds the Express app without listening, so tests can mount it directly. */
export function createApp({ env, pool, logger, limits = limitsFromEnv(env) }: AppDeps): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(requestId);
  app.use(requestLogger(logger));
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());

  app.use(healthRoutes(createHealthController(env, pool)));

  const limiters = createLimiters(limits);
  const guard = requireUser(pool, env);
  app.use("/api", limiters.api, originCheck(env.CORS_ORIGINS));
  app.use("/api/auth", authRoutes(createAuthController(env, pool), limiters, guard));
  app.use("/api/demo", demoRoutes(createDemoController(pool), limiters, guard));
  app.use("/api/contracts", contractsRoutes(createContractsController(pool), guard));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
