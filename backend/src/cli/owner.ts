import { Pool } from "pg";

/** Runs a one-off command as the table owner, always closes the pool, and exits non-zero on failure. */
export function runAsOwner(url: string | undefined, task: (pool: Pool) => Promise<void>): void {
  const run = async () => {
    if (!url) throw new Error("MIGRATE_DATABASE_URL is not set. Copy .env.example to .env.");
    const pool = new Pool({ connectionString: url });
    try {
      await task(pool);
    } finally {
      await pool.end();
    }
  };
  run().catch((error: unknown) => {
    console.error(String(error));
    process.exitCode = 1;
  });
}
