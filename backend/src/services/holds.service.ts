import type { Pool, PoolClient } from "pg";
import type { Env } from "../config/env";
import { withContractLock, withTransaction } from "../db/tx";
import { payRefusal } from "../domain/payable";
import type { PayRefusal } from "../domain/payable";
import { AppError } from "../http/errors";
import {
  authorizeOrderRequest,
  createOrderRequest,
  getOrderRequest,
  paypalWritesOpen,
} from "../integrations/paypal/client";
import type { PayPalClient, PayPalRequest } from "../integrations/paypal/client";
import type { Notifier } from "../realtime/notify";
import { findByShare, lockContractRow, touchContract } from "../repositories/contracts.repo";
import type { ContractRow } from "../repositories/contracts.repo";
import { insertEvent } from "../repositories/events.repo";
import { insertPending, recordRead, settle } from "../repositories/operations.repo";
import type { OperationResult } from "../repositories/operations.repo";
import {
  backToCheckout,
  closeCheckout,
  declineCheckout,
  findForPayment,
  markAuthorizing,
  markHeld,
  openCheckout,
  storeOrder,
} from "../repositories/shares.repo";
import type { PayingShare } from "../repositories/shares.repo";
import type { AuthorizeResponse, CheckoutResponse } from "../shared/api-types";
import { UNCLEAR_RESULT } from "../shared/rules";
import { resolveAfterHold } from "./resolve.service";
import { readShareReply } from "./shares.service";

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

const refused = (refusal: PayRefusal): AppError => new AppError(refusal, REFUSALS[refusal]);
export const badLink = (): AppError => new AppError("not_found", "That pay link does not exist.");
const writesClosed = (): AppError =>
  new AppError("paypal_disabled", "PayPal checkout is turned off right now. Nothing was charged.");

/** A call to make, recorded before it is made. */
interface Attempt {
  contractId: string;
  displayName: string;
  operationId: string;
  request: PayPalRequest;
}

/** Every decision about money starts here: the plan and the share as they are now, with the contract locked. */
async function lockForPayment(
  client: PoolClient,
  shareId: string,
): Promise<{ contract: ContractRow; title: string; share: PayingShare }> {
  const unlocked = await findByShare(client, shareId);
  if (unlocked) await lockContractRow(client, unlocked.id);
  const contract = unlocked && (await findByShare(client, shareId));
  const share = await findForPayment(client, shareId);
  if (!contract?.title || !share) throw badLink();
  return { contract, title: contract.title, share };
}

/**
 * Transaction 1: the amount comes from the share row, never the browser. Returns the stored link when one exists.
 * Otherwise it reserves the share and records the call, so a crash from here on leaves a `pending` operation and sync
 * can find it.
 */
async function beginCheckout(deps: HoldDeps, shareId: string): Promise<CheckoutResponse | Attempt> {
  return withTransaction(deps.pool, async (client) => {
    const { contract, title, share } = await lockForPayment(client, shareId);
    const refusal = payRefusal(contract, share);
    if (refusal) throw refused(refusal);
    if (!paypalWritesOpen(deps.env)) throw writesClosed();
    if (share.status === "checkout_open") {
      if (share.orderId === null || share.approveUrl === null) throw refused("money_unknown");
      return { outcome: "completed", order_id: share.orderId, approve_url: share.approveUrl };
    }
    if (share.checkoutAttempt >= MAX_CHECKOUT_ATTEMPTS) throw refused("share_not_payable");

    const checkoutAttempt = share.checkoutAttempt + 1;
    const request = createOrderRequest(deps.env, {
      shareId,
      checkoutAttempt,
      amountCents: share.amountCents,
      title,
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
    // A reset can delete the plan during the call. Its link never reached the friend, so the order stays unapproved.
    if (version === 0) throw badLink();
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

/** PayPal completed the call but refused the hold, and retrying this order would only replay that answer. */
const REFUSED_HOLD_ISSUES = ["AUTHORIZATION_DENIED", "AUTHORIZATION_PENDING"];

/** How an authorize ended, and what goes on the record. */
interface Ending {
  outcome: "completed" | "failed" | "unknown";
  hold: { authorizationId: string; expiresAt: Date } | null;
  operation: OperationResult;
  read: { request: PayPalRequest; result: OperationResult } | null;
  /** The order can never succeed, so the friend needs a new one. */
  orderDead?: boolean;
  /** PayPal turned the call away unprocessed (401, 408, 429): not a refusal, so the friend can retry. */
  busy?: boolean;
}

/**
 * Transaction 1. A hold already placed for this order is returned as it is, so a repeated return URL never reaches
 * PayPal. Otherwise the share is marked unknown before the call, so a crash during it can never free the share.
 */
async function beginAuthorize(
  deps: HoldDeps,
  shareId: string,
  orderId: string,
): Promise<{ placed: string } | Attempt> {
  return withTransaction(deps.pool, async (client) => {
    const { contract, share } = await lockForPayment(client, shareId);
    const refusal = payRefusal(contract, share);
    if (refusal === "sample_row") throw refused(refusal);
    if (share.orderId !== orderId) {
      throw new AppError("bad_request", "That PayPal order does not belong to this share.");
    }
    if (share.authorizationId !== null) return { placed: share.authorizationId };
    if (refusal) throw refused(refusal);
    if (!paypalWritesOpen(deps.env)) throw writesClosed();

    const request = authorizeOrderRequest(orderId);
    await markAuthorizing(client, shareId);
    const operationId = await insertPending(client, { shareId, kind: "authorize", request });
    return { contractId: contract.id, displayName: share.displayName, operationId, request };
  });
}

/** Asks PayPal for the hold. If this order already has one, that hold is read and kept, and no second one is placed. */
async function placeHold(deps: HoldDeps, orderId: string, request: PayPalRequest): Promise<Ending> {
  const result = await deps.paypal.authorizeOrder(request);
  if (result.outcome === "completed") {
    return { outcome: "completed", hold: result.value, operation: result, read: null };
  }
  if (result.outcome === "unknown" || result.issue !== "ORDER_ALREADY_AUTHORIZED") {
    const orderDead = result.outcome === "failed" && REFUSED_HOLD_ISSUES.includes(result.issue ?? "");
    const busy = result.outcome === "failed" && !result.processed;
    return { outcome: result.outcome, hold: null, operation: result, read: null, orderDead, busy };
  }

  const readRequest = getOrderRequest(orderId);
  const fact = await deps.paypal.getOrder(readRequest);
  const read = { request: readRequest, result: fact };
  const found = fact.outcome === "completed" ? fact.value.authorization : null;
  if (found?.status === "CREATED" && found.expiresAt !== null) {
    const hold = { authorizationId: found.id, expiresAt: found.expiresAt };
    return { outcome: "completed", hold, operation: result, read };
  }
  // PayPal says a hold exists, but this read does not show a usable one, so sync has to settle it.
  return { outcome: "unknown", hold: null, operation: { ...result, outcome: "unknown" }, read };
}

/**
 * Transaction 2. A refused hold goes to `declined`, so a new order can start. Any other refusal goes back to
 * `checkout_open`, because the order may still work. Unknown stays `authorize_unknown` until sync.
 */
async function finishAuthorize(
  deps: HoldDeps,
  shareId: string,
  attempt: Attempt,
  ending: Ending,
): Promise<number> {
  return withTransaction(deps.pool, async (client) => {
    const version = await touchContract(client, attempt.contractId);
    const { contractId, displayName } = attempt;
    await settle(client, attempt.operationId, ending.operation);
    if (ending.read) await recordRead(client, { shareId, kind: "get_order", ...ending.read });
    if (ending.orderDead) {
      await declineCheckout(client, shareId);
      const detail = `PayPal did not approve ${displayName}'s hold.`;
      await insertEvent(client, { contractId, shareId, type: "checkout_declined", detail });
    } else if (ending.outcome === "failed") {
      await backToCheckout(client, shareId);
    }
    if (ending.outcome === "unknown") {
      const detail = `PayPal gave no clear result for ${displayName}.`;
      await insertEvent(client, { contractId, shareId, type: "hold_unknown", detail });
    }
    if (ending.hold) {
      await markHeld(client, shareId, ending.hold);
      const detail = `${displayName}'s share is on hold.`;
      await insertEvent(client, { contractId, shareId, type: "hold_placed", detail });
    }
    return version;
  });
}

/** The reply is public, as the route is: the payer's view, plus the hold id the page shows once. */
async function authorizeReply(
  deps: HoldDeps,
  shareId: string,
  outcome: AuthorizeResponse["outcome"],
  authorizationId: string | null,
): Promise<AuthorizeResponse> {
  const reply = await readShareReply(deps.pool, shareId);
  return { ...reply, outcome, share: { ...reply.share, authorization_id: authorizationId } };
}

/**
 * Places the hold after the friend approved in PayPal. The contract lock covers the whole request, so a resolve can
 * never run beside it. PayPal is called outside any transaction, and only the id the server stored is accepted.
 */
export async function authorizeShare(
  deps: HoldDeps,
  shareId: string,
  orderId: string,
): Promise<AuthorizeResponse> {
  const contract = await findByShare(deps.pool, shareId);
  if (!contract) throw badLink();

  return withContractLock(deps.pool, contract.id, async () => {
    const begun = await beginAuthorize(deps, shareId, orderId);
    if ("placed" in begun) return authorizeReply(deps, shareId, "completed", begun.placed);

    const ending = await placeHold(deps, orderId, begun.request);
    const version = await finishAuthorize(deps, shareId, begun, ending);
    deps.notifier.contractChanged(begun.contractId, version);
    deps.notifier.shareChanged(shareId, begun.contractId);

    if (ending.outcome === "failed") {
      throw new AppError(
        "paypal_failed",
        ending.busy
          ? "PayPal is busy. Try again in a moment. Nothing was held."
          : "PayPal did not approve this hold.",
      );
    }
    // The hold that completes the group resolves here, under the lock this request already holds.
    if (ending.outcome === "completed") await resolveAfterHold(deps, begun.contractId);
    return authorizeReply(deps, shareId, ending.outcome, ending.hold?.authorizationId ?? null);
  });
}
