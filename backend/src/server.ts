import { createServer } from "node:http";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { createPool } from "./db/pool";
import { migrationsCurrent } from "./db/migrator";
import { createLogger } from "./observability/logger";
import { attachRealtime } from "./realtime/io";
import { createDeferredNotifier } from "./realtime/notify";
import { sweepExpiredGuests, sweepStaleDrafts } from "./services/housekeeping.service";

const SHUTDOWN_GRACE_MS = 10_000;
const GUEST_SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

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

  // The app is built before the socket server (which needs the HTTP server), so services get a notifier bound later.
  const deferred = createDeferredNotifier();
  const server = createServer(createApp({ env, pool, logger, notifier: deferred.notifier }));
  const { io } = attachRealtime(server, { env, pool, logger });
  deferred.bind(io);
  server.listen(env.PORT, () => log.info("listening", { port: env.PORT, version: env.GIT_SHA }));

  // Remove expired guests (who hold no live money) on boot and every 6 hours.
  const sweep = (): void => {
    sweepExpiredGuests(pool, logger).catch((err: unknown) => log.error("guest sweep failed", { err }));
    sweepStaleDrafts(pool, logger).catch((err: unknown) => log.error("draft sweep failed", { err }));
  };
  sweep();
  setInterval(sweep, GUEST_SWEEP_INTERVAL_MS).unref();

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
    // io.close() disconnects every socket and closes the HTTP server, then we close the database pool.
    void io.close(() => {
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
