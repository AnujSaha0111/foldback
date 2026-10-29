// Daily job: yarn housekeeping. Runs as the table OWNER (MIGRATE_DATABASE_URL), never inside the app container.
import { Pool } from "pg";
import { AI_USAGE_RETENTION_DAYS, purgeOldAiUsage } from "../src/services/housekeeping.service";

async function main(): Promise<void> {
  const url = process.env["MIGRATE_DATABASE_URL"];
  if (!url) throw new Error("MIGRATE_DATABASE_URL is not set.");
  const pool = new Pool({ connectionString: url });
  try {
    const removed = await purgeOldAiUsage(pool);
    console.log(`Removed ${removed} ai_usage rows older than ${AI_USAGE_RETENTION_DAYS} days.`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(String(error));
  process.exitCode = 1;
});
