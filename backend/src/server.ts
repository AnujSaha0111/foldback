import { createServer } from "node:http";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { createPool } from "./db/pool";
import { migrationsCurrent } from "./db/migrator";
import { createLogger } from "./observability/logger";

const SHUTDOWN_GRACE_MS = 10_000;

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger({ level: env.LOG_LEVEL, json: env.NODE_ENV === "production" });
  const log = logger.child({ module: "server" });

  const pool = createPool({ connectionString: env.DATABASE_URL, logger });
  if (!(await migrationsCurrent(pool))) {
    log.error("migrations are not current. Run `yarn migrate` first.");
    await pool.end();
    process.exit(1);
  }

  const server = createServer(createApp({ env, pool, logger }));
  server.listen(env.PORT, () => log.info("listening", { port: env.PORT, version: env.GIT_SHA }));

  let closing = false;
  const shutdown = (signal: string): void => {
    if (closing) return;
    closing = true;
    log.info("shutting down", { signal });
    const timer = setTimeout(() => {
      log.error("shutdown timed out");
      process.exit(1);
    }, SHUTDOWN_GRACE_MS);
    timer.unref();
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err: unknown) => {
  // The logger may not exist yet (a bad env fails before it). stderr is always safe.
  process.stderr.write(`Failed to start: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
