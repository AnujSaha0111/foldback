import { withContractLock, withTransaction } from "../db/tx";
import { reasons } from "../domain/reason";
import { AppError } from "../http/errors";
import {
  findById,
  findOwned,
  lockContractRow,
  setDemoNow,
  touchContract,
} from "../repositories/contracts.repo";
import { hasEvent, insertEvent } from "../repositories/events.repo";
import type { ContractRead } from "../shared/api-types";
import { readContract } from "./contracts.service";
import type { HoldDeps } from "./holds.service";
import { runResolve } from "./resolve.service";

// The organizer's two controls: Resolve now, and the demo clock. Both run the rule under the contract lock.

async function assertOwned(deps: HoldDeps, ownerId: string, contractId: string): Promise<void> {
  if (!(await findOwned(deps.pool, ownerId, contractId))) {
    throw new AppError("not_found", "That plan does not exist.");
  }
}

/** The Resolve button. */
export async function resolveOwned(
  deps: HoldDeps,
  ownerId: string,
  contractId: string,
): Promise<ContractRead> {
  await assertOwned(deps, ownerId, contractId);
  await withContractLock(deps.pool, contractId, () => runResolve(deps, contractId));
  return readContract(deps.pool, ownerId, contractId);
}

/**
 * Moves the demo clock, then resolves. The move stays even when resolve stops with a 409, and that 409 carries the
 * read model so the board can show the new time.
 */
export async function moveClock(
  deps: HoldDeps,
  ownerId: string,
  contractId: string,
  demoNow: Date,
): Promise<ContractRead> {
  await assertOwned(deps, ownerId, contractId);
  await withContractLock(deps.pool, contractId, async () => {
    const version = await withTransaction(deps.pool, async (client) => {
      await lockContractRow(client, contractId);
      const contract = await findById(client, contractId);
      if (!contract?.demoNow || !contract.timezone) {
        throw new AppError("not_confirmed", "This plan is not confirmed yet.");
      }
      if (contract.status === "kept" || contract.status === "released") {
        throw new AppError("contract_closed", "This plan is already decided.");
      }
      if (demoNow < contract.demoNow && (await hasEvent(client, contractId, "hold_placed"))) {
        throw new AppError("bad_clock", "The demo clock cannot move backward after a payment was held.");
      }
      await setDemoNow(client, contractId, demoNow);
      const detail = reasons.clockMoved(demoNow, contract.timezone);
      await insertEvent(client, { contractId, type: "clock_moved", detail });
      return touchContract(client, contractId);
    });
    deps.notifier.contractChanged(contractId, version);
    try {
      await runResolve(deps, contractId);
    } catch (error) {
      if (!(error instanceof AppError) || error.status !== 409) throw error;
      const read = await readContract(deps.pool, ownerId, contractId);
      throw new AppError(error.code, error.message, undefined, {}, { contract_read: read });
    }
  });
  return readContract(deps.pool, ownerId, contractId);
}
