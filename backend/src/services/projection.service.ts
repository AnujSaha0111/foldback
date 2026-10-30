import type { Pool } from "pg";
import { projectScheduler } from "../domain/projection";
import { AppError } from "../http/errors";
import { findOwned } from "../repositories/contracts.repo";
import { listForContract } from "../repositories/shares.repo";
import type { SchedulerProjection } from "../shared/api-types";

/** The board's data for one contract. Someone else's contract is `not_found`, and so is one that has no deadline yet. */
export async function readScheduler(
  pool: Pool,
  ownerId: string,
  contractId: string,
): Promise<SchedulerProjection> {
  const contract = await findOwned(pool, ownerId, contractId);
  if (!contract?.deadlineAt || !contract.timezone)
    throw new AppError("not_found", "That plan has no board yet.");
  const shares = await listForContract(pool, contract.id);
  return projectScheduler({
    timezone: contract.timezone,
    status: contract.status,
    deadlineAt: contract.deadlineAt,
    graceUntil: contract.graceUntil,
    demoNow: contract.demoNow,
    shares,
  });
}
