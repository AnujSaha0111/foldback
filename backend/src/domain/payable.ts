import { OPEN_SHARE_STATUSES } from "./statuses";
import type { ContractStatus, Direction, MoneySource, ShareStatus } from "./statuses";

export interface PayableContract {
  status: ContractStatus;
  direction: Direction | null;
  demoNow: Date | null;
  deadlineAt: Date | null;
  graceUntil: Date | null;
}

export interface PayableShare {
  status: ShareStatus;
  isGraceSubject: boolean;
  moneySource: MoneySource;
}

/**
 * Whether a friend may start checkout or finish authorizing this share right now. Pure: it only reads its inputs,
 * and "now" is the contract's demo clock, never the wall clock.
 *
 * - Active contract, no decision made yet, share still open, before the deadline; or
 * - Grace contract, this share is the grace person's, still open, before the grace end.
 *
 * Sample rows are never payable, because no PayPal call can be made for them.
 */
export function isPayable(contract: PayableContract, share: PayableShare): boolean {
  if (share.moneySource !== "sandbox") return false;
  if (!OPEN_SHARE_STATUSES.includes(share.status)) return false;
  if (contract.demoNow === null) return false;
  const now = contract.demoNow.getTime();

  if (contract.status === "active") {
    return contract.direction === null && contract.deadlineAt !== null && now < contract.deadlineAt.getTime();
  }
  if (contract.status === "grace") {
    return share.isGraceSubject && contract.graceUntil !== null && now < contract.graceUntil.getTime();
  }
  return false;
}
