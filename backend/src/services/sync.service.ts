import type { PoolClient } from "pg";
import { withContractLock, withTransaction } from "../db/tx";
import { getAuthorizationRequest, getOrderRequest } from "../integrations/paypal/client";
import type { PayPalClient, PayPalRequest } from "../integrations/paypal/client";
import { findById, findByShare, lockContractRow, touchContract } from "../repositories/contracts.repo";
import { insertEvent } from "../repositories/events.repo";
import { findOpen, recordRead, resolveBySync, sharesWithOpenCalls } from "../repositories/operations.repo";
import type { OpenOperation, OperationResult } from "../repositories/operations.repo";
import {
  backToCheckout,
  closeCheckout,
  declineCheckout,
  findForPayment,
  listForContract,
  markHeld,
  markKept,
  setShareStatus,
} from "../repositories/shares.repo";
import type { ShareReply } from "../shared/api-types";
import { UNKNOWN_SHARE_STATUSES } from "../shared/statuses";
import type { ShareStatus } from "../shared/statuses";
import { badLink } from "./holds.service";
import type { HoldDeps } from "./holds.service";
import { readShareReply } from "./shares.service";

// Sync is the only way out of an unknown status (docs/spec/paypal.md, "Reads used by sync"). It only ever reads
// PayPal, and it never captures or voids. A capture or void left unknown is settled here, and the next resolve
// carries on in the same direction.

/** A create this old has ended one way or the other: its token fetch, the call, and a retry, each at the timeout. */
const CREATE_SETTLED_TIMEOUTS = 3;

/** What sync found on our side, before asking PayPal anything. */
interface Look {
  contractId: string;
  displayName: string;
  status: ShareStatus;
  operationId: string | null;
  /** Null when a lost create left no order to ask about, so nothing is read. */
  orderId: string | null;
  authorizationId: string | null;
}

type OrderFact = Awaited<ReturnType<PayPalClient["getOrder"]>>;

/** Where the share goes, and how its open operation ended. Null leaves both as they are. */
type Change =
  | { to: "waiting" | "checkout_open" | "declined"; operation: "failed" }
  | { to: "declined"; operation: null }
  | { to: "held"; operation: "completed"; hold: { authorizationId: string; expiresAt: Date } }
  | { to: "rehold"; operation: "failed" }
  | { to: "kept"; operation: "completed"; captureId: string }
  | { to: "released"; operation: "completed" }
  | null;

interface Read {
  kind: "get_order" | "get_authorization";
  request: PayPalRequest;
  result: OperationResult;
}

const NOT_APPROVED = new Set(["CREATED", "PAYER_ACTION_REQUIRED"]);
const STILL_OPEN = new Set(["APPROVED", "CREATED", "PAYER_ACTION_REQUIRED"]);
const HOLD_GONE = new Set(["DENIED", "PENDING", "VOIDED", "EXPIRED"]);

/** A cancel return closes the checkout only when the order was never approved, or PayPal no longer has it. */
function afterCancel(fact: OrderFact): Change {
  const gone = fact.outcome === "failed" && fact.name === "RESOURCE_NOT_FOUND";
  const unapproved = fact.outcome === "completed" && NOT_APPROVED.has(fact.value.status);
  return gone || unapproved ? { to: "declined", operation: null } : null;
}

/** An authorize with no clear result: the order says whether a hold exists. */
function afterAuthorize(fact: OrderFact): Change {
  if (fact.outcome !== "completed") return null;
  const { status, authorization } = fact.value;
  if (authorization?.status === "CREATED" && authorization.expiresAt !== null) {
    const hold = { authorizationId: authorization.id, expiresAt: authorization.expiresAt };
    return { to: "held", operation: "completed", hold };
  }
  if (authorization !== null) {
    return HOLD_GONE.has(authorization.status) ? { to: "declined", operation: "failed" } : null;
  }
  if (status === "VOIDED") return { to: "declined", operation: "failed" };
  return STILL_OPEN.has(status) ? { to: "checkout_open", operation: "failed" } : null;
}

/** The rows of the mapping that belong to checkout and authorize. Capture and void are phase 7. */
function decide(seen: Look, fact: OrderFact | null, cancelled: boolean): Change {
  if (seen.orderId === null) return { to: "waiting", operation: "failed" };
  if (fact === null) return null;
  if (seen.status === "checkout_open" && cancelled) return afterCancel(fact);
  return seen.status === "authorize_unknown" ? afterAuthorize(fact) : null;
}

/** A pending create may still be waiting on PayPal, and settling it now would race its own second transaction. */
function stillRunning(open: OpenOperation | null, timeoutMs: number): boolean {
  if (open?.outcome !== "pending") return false;
  return Date.now() - open.createdAt.getTime() < CREATE_SETTLED_TIMEOUTS * timeoutMs;
}

/** Null when there is nothing to settle: the share is not unknown, or its call may still be running. */
async function look(deps: HoldDeps, shareId: string, cancelled: boolean): Promise<Look | null> {
  const contract = await findByShare(deps.pool, shareId);
  const share = await findForPayment(deps.pool, shareId);
  if (!contract || share?.moneySource !== "sandbox") return null;
  const open = await findOpen(deps.pool, shareId);
  const seen = {
    contractId: contract.id,
    displayName: share.displayName,
    status: share.status,
    operationId: open?.id ?? null,
    orderId: share.orderId,
    authorizationId: share.authorizationId,
  };
  if (share.status === "checkout_open" && share.orderId === null) {
    return stillRunning(open, deps.env.PAYPAL_TIMEOUT_MS) ? null : seen;
  }
  const wanted =
    UNKNOWN_SHARE_STATUSES.includes(share.status) || (share.status === "checkout_open" && cancelled);
  return wanted ? seen : null;
}

/** The status change itself, with the event the board shows for it. */
async function move(
  client: PoolClient,
  shareId: string,
  seen: Look,
  change: NonNullable<Change>,
): Promise<void> {
  const { contractId, displayName } = seen;
  if (change.to === "waiting") await closeCheckout(client, shareId);
  if (change.to === "checkout_open") await backToCheckout(client, shareId);
  if (change.to === "declined") {
    await declineCheckout(client, shareId);
    // Neutral on purpose: the friend may have cancelled, or PayPal may have refused or voided the hold.
    const detail = `${displayName}'s PayPal checkout ended. Nothing was held.`;
    await insertEvent(client, { contractId, shareId, type: "checkout_declined", detail });
  }
  if (change.to === "rehold") await setShareStatus(client, shareId, "held");
  if (change.to === "kept") {
    await markKept(client, shareId, change.captureId);
    const detail = `${displayName}'s share was captured.`;
    await insertEvent(client, { contractId, shareId, type: "capture_completed", detail });
  }
  if (change.to === "released") {
    await setShareStatus(client, shareId, "released");
    const detail = `${displayName}'s hold was released.`;
    await insertEvent(client, { contractId, shareId, type: "hold_released", detail });
  }
  if (change.to === "held") {
    await markHeld(client, shareId, change.hold);
    const detail = `${displayName}'s share is on hold.`;
    await insertEvent(client, { contractId, shareId, type: "hold_placed", detail });
  }
}

/** A paused plan whose last unknown just cleared. It stays paused until someone presses Resolve. */
async function nothingUnknown(client: PoolClient, contractId: string): Promise<boolean> {
  const contract = await findById(client, contractId);
  if (contract?.status !== "blocked") return false;
  const shares = await listForContract(client, contractId);
  const open = await sharesWithOpenCalls(client, contractId);
  return open.size === 0 && !shares.some((share) => UNKNOWN_SHARE_STATUSES.includes(share.status));
}

/** A capture or void with no clear result: the authorization says what happened, and the order holds the capture id. */
async function askAboutHold(deps: HoldDeps, seen: Look): Promise<{ change: Change; reads: Read[] }> {
  const authRequest = getAuthorizationRequest(seen.authorizationId ?? "");
  const auth = await deps.paypal.getAuthorization(authRequest);
  const reads: Read[] = [{ kind: "get_authorization", request: authRequest, result: auth }];
  const status = auth.outcome === "completed" ? auth.value.status : null;
  if (status === "CREATED") return { change: { to: "rehold", operation: "failed" }, reads };
  if (seen.status === "void_unknown") {
    const gone = status === "VOIDED" || status === "EXPIRED";
    return { change: gone ? { to: "released", operation: "completed" } : null, reads };
  }
  if (status !== "CAPTURED" && status !== "PARTIALLY_CAPTURED") return { change: null, reads };

  const orderRequest = getOrderRequest(seen.orderId ?? "");
  const order = await deps.paypal.getOrder(orderRequest);
  reads.push({ kind: "get_order", request: orderRequest, result: order });
  const capture = order.outcome === "completed" ? order.value.capture : null;
  return { change: capture ? { to: "kept", operation: "completed", captureId: capture.id } : null, reads };
}

/** Reads PayPal for whatever this share is waiting on. A lost create needs no read at all. */
async function askPayPal(
  deps: HoldDeps,
  seen: Look,
  cancelled: boolean,
): Promise<{ change: Change; reads: Read[] }> {
  if (seen.status === "capture_unknown" || seen.status === "void_unknown") return askAboutHold(deps, seen);
  if (seen.orderId === null) return { change: decide(seen, null, cancelled), reads: [] };
  const request = getOrderRequest(seen.orderId);
  const result = await deps.paypal.getOrder(request);
  return { change: decide(seen, result, cancelled), reads: [{ kind: "get_order", request, result }] };
}

/** Writes the change, unless the share or its open call moved while PayPal was being asked. Returns the version. */
async function apply(
  deps: HoldDeps,
  shareId: string,
  seen: Look,
  change: Change,
  reads: Read[],
): Promise<number | null> {
  return withTransaction(deps.pool, async (client) => {
    await lockContractRow(client, seen.contractId);
    for (const read of reads) await recordRead(client, { shareId, ...read });
    const share = await findForPayment(client, shareId);
    const open = await findOpen(client, shareId);
    if (!change || share?.status !== seen.status || (open?.id ?? null) !== seen.operationId) return null;

    if (change.operation && seen.operationId) await resolveBySync(client, seen.operationId, change.operation);
    await move(client, shareId, seen, change);
    if (await nothingUnknown(client, seen.contractId)) {
      const detail = "PayPal answered every unclear result. Resolve continues where it stopped.";
      await insertEvent(client, { contractId: seen.contractId, type: "contract_unblocked", detail });
    }
    return touchContract(client, seen.contractId);
  });
}

/**
 * Asks PayPal how an unclear call ended, or closes a checkout the friend cancelled. Runs under the contract lock, so it
 * never meets an authorize halfway. Anything it cannot settle stays as it was, for the next sync.
 */
export async function syncShare(deps: HoldDeps, shareId: string, cancelled: boolean): Promise<ShareReply> {
  const contract = await findByShare(deps.pool, shareId);
  if (!contract) throw badLink();

  return withContractLock(deps.pool, contract.id, async () => {
    const seen = await look(deps, shareId, cancelled);
    if (seen) {
      const { change, reads } = await askPayPal(deps, seen, cancelled);
      const version = await apply(deps, shareId, seen, change, reads);
      if (version !== null) {
        deps.notifier.contractChanged(seen.contractId, version);
        deps.notifier.shareChanged(shareId, seen.contractId);
      }
    }
    return readShareReply(deps.pool, shareId);
  });
}
