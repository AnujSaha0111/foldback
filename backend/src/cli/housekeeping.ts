// Daily job: yarn housekeeping. Runs as the table OWNER (MIGRATE_DATABASE_URL), never inside the app container.
import { AI_USAGE_RETENTION_DAYS, purgeOldAiUsage } from "../services/housekeeping.service";
import { runAsOwner } from "./owner";

runAsOwner(process.env["MIGRATE_DATABASE_URL"], async (pool) => {
  const removed = await purgeOldAiUsage(pool);
  console.log(`Removed ${removed} ai_usage rows older than ${AI_USAGE_RETENTION_DAYS} days.`);
});
