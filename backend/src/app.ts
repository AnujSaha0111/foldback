import express from "express";
import type { Express } from "express";
import helmet from "helmet";
import type { Pool } from "pg";
import type { Env } from "./config/env";
import { createHealthController } from "./controllers/health.controller";
import { errorHandler, notFoundHandler } from "./http/middleware/errorHandler";
import { requestId } from "./http/middleware/requestId";
import { requestLogger } from "./http/middleware/requestLogger";
import type { Logger } from "./observability/logger";
import { healthRoutes } from "./routes/health.routes";

export interface AppDeps {
  env: Env;
  pool: Pool;
  logger: Logger;
}

/** Builds the Express app without listening, so tests can mount it directly. */
export function createApp({ env, pool, logger }: AppDeps): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(requestId);
  app.use(requestLogger(logger));
  app.use(helmet());
  app.use(express.json({ limit: "32kb" }));

  app.use(healthRoutes(createHealthController(env, pool)));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
