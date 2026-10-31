import type { Pool } from "pg";
import { isPayable } from "../domain/payable";
import { AppError } from "../http/errors";
import { findOwned, listByOwner } from "../repositories/contracts.repo";
import type { ContractRow } from "../repositories/contracts.repo";
import { listRecent } from "../repositories/events.repo";
import { listForContract } from "../repositories/shares.repo";
import type { ShareRow } from "../repositories/shares.repo";
import type { ApiContract, ApiShare, ContractRead, ContractSummary } from "../shared/api-types";

const EVENTS_IN_READ_MODEL = 30;

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

function toSummary(c: ContractRow): ContractSummary {
  return {
    id: c.id,
    seed_key: c.seedKey,
    title: c.title,
    status: c.status,
    money_source: c.moneySource,
    headcount: c.headcount,
    held_count: c.heldCount,
    kept_count: c.keptCount,
    released_count: c.releasedCount,
    share_cents: c.shareCents,
    deadline_at: iso(c.deadlineAt),
    timezone: c.timezone,
    demo_now: iso(c.demoNow),
    resolution_reason: c.resolutionReason,
  };
}

function toApiContract(c: ContractRow): ApiContract {
  return {
    ...toSummary(c),
    direction: c.direction,
    currency: c.currency,
    total_cents: c.totalCents,
    grace_person_name: c.graceName,
    grace_until: iso(c.graceUntil),
    clarification_question: c.clarificationQuestion,
    extraction: c.extraction,
  };
}

function toApiShare(contract: ContractRow, share: ShareRow): ApiShare {
  return {
    id: share.id,
    display_name: share.displayName,
    is_grace_subject: share.isGraceSubject,
    status: share.status,
    amount_cents: share.amountCents,
    money_source: share.moneySource,
    sample_label: share.sampleLabel,
    order_id: share.orderId,
    authorization_id: share.authorizationId,
    authorization_expires_at: iso(share.authorizationExpiresAt),
    capture_id: share.captureId,
    payable: isPayable(contract, share),
    pay_path: `/pay/${share.id}`,
  };
}

export async function listContracts(pool: Pool, ownerId: string): Promise<ContractSummary[]> {
  return (await listByOwner(pool, ownerId)).map(toSummary);
}

/** The full read model of one contract. Someone else's contract is `not_found`, the same as a missing one. */
export async function readContract(pool: Pool, ownerId: string, contractId: string): Promise<ContractRead> {
  const contract = await findOwned(pool, ownerId, contractId);
  if (!contract) throw new AppError("not_found", "That plan does not exist.");
  const [shares, events] = await Promise.all([
    listForContract(pool, contract.id),
    listRecent(pool, contract.id, EVENTS_IN_READ_MODEL),
  ]);
  return {
    contract: toApiContract(contract),
    shares: shares.map((s) => toApiShare(contract, s)),
    events: events.map((e) => ({
      type: e.type,
      detail: e.detail,
      created_at: e.createdAt.toISOString(),
      share_id: e.shareId,
    })),
  };
}
