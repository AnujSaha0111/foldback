import { Pool } from "pg";
import type { Logger } from "../observability/logger";

export interface PoolOptions {
  connectionString: string;
  /** The application pool stays at 10 or fewer connections (docs/spec/deploy.md). */
  max?: number;
  logger?: Logger;
}

/** The pool for the application role. Direct connection, a 5 second statement timeout, and no crash on an idle-client error. */
export function createPool({ connectionString, max = 10, logger }: PoolOptions): Pool {
  const pool = new Pool({
    connectionString,
    max,
    statement_timeout: 5000,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30_000,
  });
  pool.on("error", (err) => {
    logger?.child({ module: "db" }).error("idle client error", { err });
  });
  return pool;
}
