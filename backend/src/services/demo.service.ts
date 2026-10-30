import type { Pool } from "pg";
import { isConstraintError } from "../db/errors";
import { withTransaction } from "../db/tx";
import { AppError } from "../http/errors";
import { deleteAllByOwner } from "../repositories/contracts.repo";
import { lockUserRow } from "../repositories/users.repo";
import type { ResetResponse } from "../shared/api-types";
import { RESET_HOLDS_WARNING } from "../shared/rules";
import { SEED_KEYS, seedUser } from "./seed.service";

const WARNING = `Your plans were reset. ${RESET_HOLDS_WARNING}`;

/**
 * Deletes the caller's plans and re-inserts the two samples, in one transaction. Never touches other users, never
 * calls PayPal. If a sandbox share holds live money the schema refuses the delete and nothing changes.
 */
export async function resetDemoData(pool: Pool, userId: string): Promise<ResetResponse> {
  try {
    await withTransaction(pool, async (client) => {
      // Serialize resets per user: a second reset waits here, then sees the first one's fresh samples.
      await lockUserRow(client, userId);
      await deleteAllByOwner(client, userId);
      await seedUser(client, userId);
    });
  } catch (err) {
    if (isConstraintError(err, "shares_live_money_undeletable")) {
      throw new AppError("live_money", "Release or void your live holds first.");
    }
    throw err;
  }
  return { ok: true, warning: WARNING, contracts: [...SEED_KEYS] };
}
