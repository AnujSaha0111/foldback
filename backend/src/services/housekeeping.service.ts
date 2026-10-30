import type { Pool } from "pg";
import type { Logger } from "../observability/logger";
import { deleteOlderThanDays } from "../repositories/aiUsage.repo";
import { repairStaleDrafts } from "../repositories/contracts.repo";
import { deleteExpiredGuestsWithoutLiveMoney } from "../repositories/users.repo";

export const AI_USAGE_RETENTION_DAYS = 90;

/** A reading that has been "in progress" longer than the whole model chain can take was lost to a restart. */
const STALE_DRAFT_MINUTES = 10;

/** Removes expired guests (and their data) that hold no live money. Runs in the app, on boot and every 6 hours. */
export async function sweepExpiredGuests(pool: Pool, logger: Logger): Promise<number> {
  const removed = await deleteExpiredGuestsWithoutLiveMoney(pool);
  if (removed > 0) logger.child({ module: "housekeeping" }).info("removed expired guests", { removed });
  return removed;
}

/** Repairs plans left in `extracting` by a restart. Runs in the app with the guest sweep. */
export async function sweepStaleDrafts(pool: Pool, logger: Logger): Promise<number> {
  const repaired = await repairStaleDrafts(pool, STALE_DRAFT_MINUTES);
  if (repaired > 0) logger.child({ module: "housekeeping" }).info("repaired stale drafts", { repaired });
  return repaired;
}

/** Deletes AI usage rows past the retention window. Needs the OWNER pool: the app role cannot delete from ai_usage. */
export async function purgeOldAiUsage(
  ownerPool: Pool,
  days: number = AI_USAGE_RETENTION_DAYS,
): Promise<number> {
  return deleteOlderThanDays(ownerPool, days);
}
