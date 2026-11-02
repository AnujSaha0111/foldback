import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { Express } from "express";
import helmet from "helmet";
import type { Pool } from "pg";
import type { Env } from "./config/env";
import { createAuthController } from "./controllers/auth.controller";
import { createContractsController } from "./controllers/contracts.controller";
import { createRulesController } from "./controllers/rules.controller";
import { createDemoController } from "./controllers/demo.controller";
import { createHealthController } from "./controllers/health.controller";
import { createSharesController } from "./controllers/shares.controller";
import { requireUser } from "./http/middleware/auth";
import { errorHandler, notFoundHandler } from "./http/middleware/errorHandler";
import { originCheck } from "./http/middleware/originCheck";
import { createLimiters, limitsFromEnv } from "./http/middleware/rateLimit";
import type { Limits } from "./http/middleware/rateLimit";
import { requestId } from "./http/middleware/requestId";
import { requestLogger } from "./http/middleware/requestLogger";
import { createPayPalClient } from "./integrations/paypal/client";
import type { Logger } from "./observability/logger";
import type { Notifier } from "./realtime/notify";
import { authRoutes } from "./routes/auth.routes";
import { contractsRoutes } from "./routes/contracts.routes";
import { sharesRoutes } from "./routes/shares.routes";
import { demoRoutes } from "./routes/demo.routes";
import { healthRoutes } from "./routes/health.routes";
import { createAiBudget } from "./services/aiBudget.service";

export interface AppDeps {
  env: Env;
  pool: Pool;
  logger: Logger;
  /** Rate limits. Tests pass larger ones; production uses the defaults from architecture.md. */
  limits?: Limits;
  /** Tells connected browsers about changes. Services call it after their transaction commits. */
  notifier: Notifier;
  /** Replaces the global fetch for model calls. Tests use it so nothing reaches the network. */
  llmFetch?: typeof fetch;
  /** Replaces the global fetch for PayPal calls, for the same reason. */
  paypalFetch?: typeof fetch;
  now?: () => Date;
}

/** Builds the Express app without listening, so tests can mount it directly. */
export function createApp({
  env,
  pool,
  logger,
  notifier,
  llmFetch,
  paypalFetch,
  now,
  limits = limitsFromEnv(env),
}: AppDeps): Express {
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
  const ruleDeps = {
    env,
    pool,
    logger,
    notifier,
    budget: createAiBudget(env, pool),
    ...(llmFetch ? { llmFetch } : {}),
    ...(now ? { now } : {}),
  };
  app.use(
    "/api/contracts",
    contractsRoutes(
      createContractsController(pool),
      createRulesController(env, pool, ruleDeps),
      limiters,
      guard,
    ),
  );

  const paypal = createPayPalClient({ env, logger, ...(paypalFetch ? { fetch: paypalFetch } : {}) });
  app.use("/api/shares", sharesRoutes(createSharesController({ env, pool, notifier, paypal }), limiters));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
