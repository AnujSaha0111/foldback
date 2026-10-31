import type { Pool } from "pg";
import { isPayable } from "../domain/payable";
import { HOLDING_SHARE_STATUSES } from "../domain/statuses";
import { AppError } from "../http/errors";
import { findByShare } from "../repositories/contracts.repo";
import { listForContract } from "../repositories/shares.repo";
import type { PublicShare } from "../shared/api-types";

/**
 * What a pay link shows. Holding the link is the permission, so this returns only what the payer needs: no PayPal
 * ids, and nobody else's status beyond the count. A share only exists once its plan is confirmed, so the terms are set.
 */
export async function readPublicShare(pool: Pool, shareId: string): Promise<PublicShare> {
  const contract = await findByShare(pool, shareId);
  const shares = contract ? await listForContract(pool, contract.id) : [];
  const share = shares.find((candidate) => candidate.id === shareId);
  if (
    !contract?.title ||
    !contract.deadlineAt ||
    !contract.timezone ||
    !contract.demoNow ||
    !contract.currency ||
    contract.headcount === null ||
    !share
  ) {
    throw new AppError("not_found", "That pay link does not exist.");
  }
  return {
    share_id: share.id,
    contract_id: contract.id,
    display_name: share.displayName,
    title: contract.title,
    amount_cents: share.amountCents,
    currency: contract.currency,
    headcount: contract.headcount,
    held_count: shares.filter((candidate) => HOLDING_SHARE_STATUSES.includes(candidate.status)).length,
    deadline_at: contract.deadlineAt.toISOString(),
    grace_until: contract.graceUntil ? contract.graceUntil.toISOString() : null,
    is_grace_subject: share.isGraceSubject,
    timezone: contract.timezone,
    demo_now: contract.demoNow.toISOString(),
    status: share.status,
    contract_status: contract.status,
    money_source: share.moneySource,
    payable: isPayable(contract, share),
    other_names: shares.filter((candidate) => candidate.id !== shareId).map((other) => other.displayName),
  };
}
