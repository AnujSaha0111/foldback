import type { Pool } from "pg";
import type { Env } from "../config/env";
import { withTransaction } from "../db/tx";
import { payRefusal } from "../domain/payable";
import type { PayRefusal } from "../domain/payable";
import { AppError } from "../http/errors";
import { createOrderRequest, paypalWritesOpen } from "../integrations/paypal/client";
import type { PayPalClient, PayPalRequest } from "../integrations/paypal/client";
import type { Notifier } from "../realtime/notify";
import { findByShare, lockContractRow, touchContract } from "../repositories/contracts.repo";
import { insertEvent } from "../repositories/events.repo";
import { insertPending, settle } from "../repositories/operations.repo";
import { closeCheckout, findForCheckout, openCheckout, storeOrder } from "../repositories/shares.repo";
import type { CheckoutResponse } from "../shared/api-types";
import { UNCLEAR_RESULT } from "../shared/rules";

export interface HoldDeps {
  env: Env;
  pool: Pool;
  notifier: Notifier;
  paypal: PayPalClient;
}

/** The `shares_attempt_range` CHECK. Past it the insert would fail, so the share is refused first. */
const MAX_CHECKOUT_ATTEMPTS = 20;

const REFUSALS: Record<PayRefusal, string> = {
  sample_row: "This is a sample plan. No PayPal payment is possible.",
  money_unknown: UNCLEAR_RESULT,
  contract_closed: "This plan is already decided, so nothing more can be held.",
  share_already_held: "This share is already held.",
  share_not_payable: "This share cannot be held right now. Nothing was charged.",
};

/** A call to make, recorded before it is made. */
interface Attempt {
  contractId: string;
  displayName: string;
  operationId: string;
  request: PayPalRequest;
}

/**
 * Transaction 1: everything is read again under the contract lock, and the amount comes from the share row, never the
 * browser. Returns the stored link when one exists. Otherwise it reserves the share and records the call, so a crash
 * from here on leaves a `pending` operation and sync can find it.
 */
async function beginCheckout(deps: HoldDeps, shareId: string): Promise<CheckoutResponse | Attempt> {
  return withTransaction(deps.pool, async (client) => {
    const unlocked = await findByShare(client, shareId);
    if (unlocked) await lockContractRow(client, unlocked.id);
    const contract = unlocked && (await findByShare(client, shareId));
    const share = await findForCheckout(client, shareId);
    if (!contract?.title || !share) throw new AppError("not_found", "That pay link does not exist.");

    const refusal = payRefusal(contract, share);
    if (refusal) throw new AppError(refusal, REFUSALS[refusal]);
    if (!paypalWritesOpen(deps.env)) {
      throw new AppError("paypal_disabled", "PayPal checkout is turned off right now. Nothing was charged.");
    }
    if (share.status === "checkout_open") {
      if (share.orderId === null || share.approveUrl === null) {
        throw new AppError("money_unknown", UNCLEAR_RESULT);
      }
      return { outcome: "completed", order_id: share.orderId, approve_url: share.approveUrl };
    }
    if (share.checkoutAttempt >= MAX_CHECKOUT_ATTEMPTS) {
      throw new AppError("share_not_payable", REFUSALS.share_not_payable);
    }

    const checkoutAttempt = share.checkoutAttempt + 1;
    const request = createOrderRequest(deps.env, {
      shareId,
      checkoutAttempt,
      amountCents: share.amountCents,
      title: contract.title,
      displayName: share.displayName,
    });
    await openCheckout(client, shareId, checkoutAttempt);
    const operationId = await insertPending(client, { shareId, kind: "create_order", request });
    return { contractId: contract.id, displayName: share.displayName, operationId, request };
  });
}

type OrderResult = Awaited<ReturnType<PayPalClient["createOrder"]>>;

/** Transaction 2: records how the call ended. Unknown leaves the share reserved with no order, for sync to clear. */
async function finishCheckout(
  deps: HoldDeps,
  shareId: string,
  attempt: Attempt,
  result: OrderResult,
): Promise<number> {
  return withTransaction(deps.pool, async (client) => {
    const version = await touchContract(client, attempt.contractId);
    await settle(client, attempt.operationId, result);
    if (result.outcome === "failed") await closeCheckout(client, shareId);
    if (result.outcome === "completed") {
      await storeOrder(client, shareId, result.value);
      await insertEvent(client, {
        contractId: attempt.contractId,
        shareId,
        type: "order_created",
        detail: `${attempt.displayName} opened a PayPal checkout.`,
      });
    }
    return version;
  });
}

/** Opens PayPal for one share, or returns the checkout already open. PayPal is called outside any transaction. */
export async function startCheckout(deps: HoldDeps, shareId: string): Promise<CheckoutResponse> {
  const begun = await beginCheckout(deps, shareId);
  if ("outcome" in begun) return begun;

  const result = await deps.paypal.createOrder(begun.request);
  const version = await finishCheckout(deps, shareId, begun, result);
  deps.notifier.contractChanged(begun.contractId, version);
  deps.notifier.shareChanged(shareId, begun.contractId);

  if (result.outcome === "failed") {
    throw new AppError("paypal_failed", "PayPal could not open a checkout. Try again in a moment.");
  }
  return result.outcome === "completed"
    ? { outcome: "completed", order_id: result.value.orderId, approve_url: result.value.approveUrl }
    : { outcome: "unknown", order_id: null, approve_url: null };
}
