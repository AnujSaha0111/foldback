import type { Pool } from "pg";
import type { Logger } from "../observability/logger";
import { deleteOlderThanDays } from "../repositories/aiUsage.repo";
import { deleteStaleDrafts, repairStaleDrafts } from "../repositories/contracts.repo";
import { deleteExpiredGuestsWithoutLiveMoney } from "../repositories/users.repo";

export const AI_USAGE_RETENTION_DAYS = 90;

/** A reading that has been "in progress" longer than the whole model chain can take was lost to a restart. */
const STALE_DRAFT_MINUTES = 10;

/** A draft nobody confirmed in a day is abandoned. It holds no money, so it is deleted. */
const ABANDONED_DRAFT_HOURS = 24;

/** Removes expired guests (and their data) that hold no live money. Runs in the app, on boot and every 6 hours. */
export async function sweepExpiredGuests(pool: Pool, logger: Logger): Promise<number> {
  const removed = await deleteExpiredGuestsWithoutLiveMoney(pool);
  if (removed > 0) logger.child({ module: "housekeeping" }).info("removed expired guests", { removed });
  return removed;
}

/** Repairs plans left in `extracting` by a restart. Runs in the app with the guest sweep. */
export async function sweepStaleDrafts(pool: Pool, logger: Logger): Promise<number> {
  const repaired = await repairStaleDrafts(pool, STALE_DRAFT_MINUTES);
  const abandoned = await deleteStaleDrafts(pool, ABANDONED_DRAFT_HOURS);
  if (repaired + abandoned > 0) {
    logger.child({ module: "housekeeping" }).info("repaired stale drafts", { repaired, abandoned });
  }
  return repaired + abandoned;
}

/** Deletes AI usage rows past the retention window. Needs the OWNER pool: the app role cannot delete from ai_usage. */
export async function purgeOldAiUsage(
  ownerPool: Pool,
  days: number = AI_USAGE_RETENTION_DAYS,
): Promise<number> {
  return deleteOlderThanDays(ownerPool, days);
}
