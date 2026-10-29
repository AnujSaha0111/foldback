import type { Pool } from "pg";
import type { Logger } from "../observability/logger";
import { deleteOlderThanDays } from "../repositories/aiUsage.repo";
import { deleteExpiredGuestsWithoutLiveMoney } from "../repositories/users.repo";

export const AI_USAGE_RETENTION_DAYS = 90;

/** Removes expired guests (and their data) that hold no live money. Runs in the app, on boot and every 6 hours. */
export async function sweepExpiredGuests(pool: Pool, logger: Logger): Promise<number> {
  const removed = await deleteExpiredGuestsWithoutLiveMoney(pool);
  if (removed > 0) logger.child({ module: "housekeeping" }).info("removed expired guests", { removed });
  return removed;
}

/** Deletes AI usage rows past the retention window. Needs the OWNER pool: the app role cannot delete from ai_usage. */
export async function purgeOldAiUsage(
  ownerPool: Pool,
  days: number = AI_USAGE_RETENTION_DAYS,
): Promise<number> {
  return deleteOlderThanDays(ownerPool, days);
}
