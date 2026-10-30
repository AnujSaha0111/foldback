import type { Pool } from "pg";
import { withTransaction } from "../db/tx";
import { demoClockStart, sameTerms, termsOf } from "../domain/confirm";
import type { Terms } from "../domain/confirm";
import { ExtractionSchema } from "../domain/extraction";
import { AppError } from "../http/errors";
import type { Notifier } from "../realtime/notify";
import { activate, applyTerms, lockDraft } from "../repositories/contracts.repo";
import type { DraftContract } from "../repositories/contracts.repo";
import { insertEvent } from "../repositories/events.repo";
import { insertWaitingShares } from "../repositories/shares.repo";

export interface ConfirmDeps {
  pool: Pool;
  notifier: Notifier;
}

function assertAwaitingConfirmation(contract: DraftContract): void {
  if (contract.status === "awaiting_confirmation") return;
  if (contract.status === "extracting") {
    throw new AppError("resolve_in_progress", "This plan is still being read. Wait a moment.");
  }
  if (contract.status === "needs_clarification") {
    throw new AppError(
      "needs_clarification",
      contract.clarificationQuestion ?? "This plan needs one more answer first.",
    );
  }
  throw new AppError("contract_closed", "This plan is already confirmed.");
}

/** The terms stored when the text was read. A plan that reached this step always has a complete reading. */
function storedTerms(contract: DraftContract): Terms {
  const reading = ExtractionSchema.safeParse(contract.extraction);
  const terms = reading.success ? termsOf(reading.data) : null;
  if (terms === null) throw new AppError("internal", "The stored reading of this plan is incomplete.");
  return terms;
}

/**
 * Turns a read plan into a live one: one `waiting` sandbox share per person, the demo clock set, status `active`.
 * What the browser sends must equal the stored reading exactly, so the browser can never change a price, a time
 * or a name. All of it happens in one transaction. At commit the database checks that the shares match the terms.
 */
export async function confirmContract(
  deps: ConfirmDeps,
  userId: string,
  contractId: string,
  echoed: Terms,
): Promise<void> {
  const version = await withTransaction(deps.pool, async (client) => {
    const contract = await lockDraft(client, userId, contractId);
    if (!contract) throw new AppError("not_found", "That plan does not exist.");
    assertAwaitingConfirmation(contract);
    const terms = storedTerms(contract);
    if (!sameTerms(terms, echoed)) {
      throw new AppError("confirm_mismatch", "These terms do not match what was read. Read the rule again.");
    }
    await applyTerms(client, contract.id, {
      title: terms.title,
      currency: terms.currency,
      totalCents: terms.total_cents,
      shareCents: terms.share_cents,
      headcount: terms.headcount,
      deadlineAt: terms.deadline_at,
      timezone: terms.timezone,
      graceName: terms.grace_person_name,
      graceUntil: terms.grace_until,
    });
    await insertWaitingShares(client, contract.id, {
      people: terms.people,
      amountCents: terms.share_cents,
      graceName: terms.grace_person_name,
    });
    await insertEvent(client, {
      contractId: contract.id,
      type: "rule_confirmed",
      detail: `${terms.people.length} people confirmed at $${(terms.share_cents / 100).toFixed(2)} each.`,
    });
    return activate(client, contract.id, demoClockStart(terms.deadline_at));
  });
  deps.notifier.contractChanged(contractId, version);
}
