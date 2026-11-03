import type { PoolClient } from "pg";
import { withTransaction } from "../db/tx";
import { decide } from "../domain/decide";
import type { Decision } from "../domain/decide";
import { reasons } from "../domain/reason";
import { AppError } from "../http/errors";
import {
  captureAuthorizationRequest,
  getAuthorizationRequest,
  getOrderRequest,
  paypalWritesOpen,
  voidAuthorizationRequest,
} from "../integrations/paypal/client";
import type { PayPalRequest } from "../integrations/paypal/client";
import { findById, lockContractRow, setResolution, touchContract } from "../repositories/contracts.repo";
import type { ContractRow } from "../repositories/contracts.repo";
import { insertEvent } from "../repositories/events.repo";
import { insertPending, recordRead, settle, sharesWithOpenCalls } from "../repositories/operations.repo";
import type { OperationResult } from "../repositories/operations.repo";
import { listForContract, markKept, setShareStatus } from "../repositories/shares.repo";
import type { ShareRow } from "../repositories/shares.repo";
import type { HoldDeps } from "./holds.service";

// Executes what domain/decide says (architecture.md, "Resolve rules"). Always under the contract lock: the routes take
// it, and authorize already holds it. One PayPal call per share, each between two transactions, and a wave stops at
// the first result that is not a clear success. Nothing is ever retried in a loop.

type Wave = "keep" | "release";

interface Terms {
  contract: ContractRow;
  headcount: number;
  deadlineAt: Date;
  demoNow: Date;
  zone: string;
}

const closed = (): AppError => new AppError("contract_closed", "This plan is already decided.");

function confirmedTerms(contract: ContractRow | null): Terms {
  if (!contract) throw new AppError("not_found", "That plan does not exist.");
  const { headcount, deadlineAt, demoNow, timezone } = contract;
  if (headcount === null || !deadlineAt || !demoNow || !timezone) {
    throw new AppError("not_confirmed", "This plan is not confirmed yet.");
  }
  return { contract, headcount, deadlineAt, demoNow, zone: timezone };
}

function notify(deps: HoldDeps, contractId: string, version: number, shareIds: string[]): void {
  deps.notifier.contractChanged(contractId, version);
  for (const shareId of shareIds) deps.notifier.shareChanged(shareId, contractId);
}

interface Loaded {
  terms: Terms;
  shares: ShareRow[];
  decision: Decision;
}

async function load(client: PoolClient, contractId: string): Promise<Loaded> {
  await lockContractRow(client, contractId);
  const terms = confirmedTerms(await findById(client, contractId));
  const shares = await listForContract(client, contractId);
  const open = await sharesWithOpenCalls(client, contractId);
  const { contract } = terms;
  const decision = decide(
    { ...contract, headcount: terms.headcount, deadlineAt: terms.deadlineAt },
    shares.map((share) => ({ ...share, openCall: open.has(share.id) })),
    terms.demoNow,
  );
  return { terms, shares, decision };
}

async function expire(
  client: PoolClient,
  contractId: string,
  shares: ShareRow[],
  ids: string[],
): Promise<void> {
  for (const share of shares.filter((candidate) => ids.includes(candidate.id))) {
    await setShareStatus(client, share.id, "expired");
    const detail = `${share.displayName}'s share expired. Nothing was held.`;
    await insertEvent(client, { contractId, shareId: share.id, type: "share_expired", detail });
  }
}

/** Pauses the plan with a sentence saying why. Writes `contract_blocked` only on the way in. */
async function block(client: PoolClient, contract: ContractRow, reason: string): Promise<number> {
  if (contract.status !== "blocked") {
    await insertEvent(client, { contractId: contract.id, type: "contract_blocked", detail: reason });
  }
  return setResolution(client, contract.id, { status: "blocked", reason });
}

async function enterGrace(
  client: PoolClient,
  { terms, shares }: Loaded,
  decision: Extract<Decision, { kind: "enter_grace" }>,
): Promise<number | null> {
  const { contract } = terms;
  await expire(client, contract.id, shares, decision.expire);
  if (contract.status === "grace") return decision.expire.length ? touchContract(client, contract.id) : null;
  const held = shares.filter((share) => share.status === "held").length;
  const until = contract.graceUntil ?? terms.deadlineAt;
  const reason = reasons.grace(held, terms.headcount, decision.graceName, until, terms.zone);
  await insertEvent(client, { contractId: contract.id, type: "grace_started", detail: reason });
  return setResolution(client, contract.id, { status: "grace", reason });
}

interface Applied {
  wave: Wave | null;
  version: number | null;
  error: AppError | null;
}

/** The part of a decision that needs no PayPal call, written in the same transaction that read the state. */
async function applyDecision(client: PoolClient, loaded: Loaded): Promise<Applied> {
  const { terms, shares, decision } = loaded;
  const { contract } = terms;
  const none = { wave: null, version: null, error: null };
  switch (decision.kind) {
    case "closed":
      return { ...none, error: closed() };
    case "capture_refused":
      return {
        ...none,
        error: new AppError("capture_refused", contract.resolutionReason ?? "Foldback paused."),
      };
    case "unknown": {
      const reason = reasons.unknown(decision.who);
      return {
        ...none,
        version: await block(client, contract, reason),
        error: new AppError("money_unknown", reason),
      };
    }
    case "stay_active":
      if (contract.status !== "blocked") return none;
      return {
        ...none,
        version: await setResolution(client, contract.id, { status: "active", reason: null }),
      };
    case "enter_grace":
      return { ...none, version: await enterGrace(client, loaded, decision) };
    case "keep": {
      if (contract.status === "capturing") return { ...none, wave: "keep" };
      const change = { status: "capturing", direction: "keep", reason: null } as const;
      return { ...none, wave: "keep", version: await setResolution(client, contract.id, change) };
    }
    case "release": {
      await expire(client, contract.id, shares, decision.expire);
      const change = { status: "releasing", direction: "release", reason: null } as const;
      const version =
        contract.status === "releasing"
          ? await touchContract(client, contract.id)
          : await setResolution(client, contract.id, change);
      return { ...none, wave: "release", version };
    }
  }
}

function authorizationOf(share: ShareRow): string {
  if (share.authorizationId === null) throw new Error(`Held share ${share.id} has no authorization id`);
  return share.authorizationId;
}

/** Transaction 1 of a wave call: the share is marked unknown and the call recorded, before anything is sent. */
async function startCall(
  deps: HoldDeps,
  contractId: string,
  share: ShareRow,
  kind: "capture" | "void",
  request: PayPalRequest,
): Promise<string> {
  return withTransaction(deps.pool, async (client) => {
    await lockContractRow(client, contractId);
    const operationId = await insertPending(client, { shareId: share.id, kind, request });
    await setShareStatus(client, share.id, kind === "capture" ? "capture_unknown" : "void_unknown");
    return operationId;
  });
}

interface Read {
  kind: "get_order" | "get_authorization";
  request: PayPalRequest;
  result: OperationResult;
}

/** Transaction 2 of a wave call: settles the call, records any read, and applies what it meant. */
async function finishCall(
  deps: HoldDeps,
  contractId: string,
  share: ShareRow,
  call: { operationId: string; result: OperationResult; read: Read | null },
  change: (client: PoolClient, contract: ContractRow) => Promise<void>,
): Promise<void> {
  const version = await withTransaction(deps.pool, async (client) => {
    await lockContractRow(client, contractId);
    const { contract } = confirmedTerms(await findById(client, contractId));
    await settle(client, call.operationId, call.result);
    if (call.read) await recordRead(client, { shareId: share.id, ...call.read });
    await change(client, contract);
    return touchContract(client, contractId);
  });
  notify(deps, contractId, version, [share.id]);
}

/** No clear result: the share stays unknown, the plan pauses, and nothing else is sent until sync. */
async function pauseOnUnknown(
  deps: HoldDeps,
  contractId: string,
  share: ShareRow,
  call: { operationId: string; result: OperationResult },
  type: "capture_unknown" | "release_unknown",
): Promise<never> {
  const reason = reasons.unknown([share.displayName]);
  await finishCall(deps, contractId, share, { ...call, read: null }, async (client, contract) => {
    await insertEvent(client, { contractId, shareId: share.id, type, detail: reason });
    await block(client, contract, reason);
  });
  throw new AppError("money_unknown", reason);
}

/**
 * The call never reached PayPal (no token, no keys, the kill switch). Nothing happened, so the share is held again and
 * the plan pauses. It is never a refusal: that would mark a capture failed for good.
 */
async function pauseUnsent(
  deps: HoldDeps,
  contractId: string,
  share: ShareRow,
  call: { operationId: string; result: OperationResult },
): Promise<never> {
  const reason = reasons.unreachable(share.displayName);
  await finishCall(deps, contractId, share, { ...call, read: null }, async (client, contract) => {
    await setShareStatus(client, share.id, "held");
    await block(client, contract, reason);
  });
  throw new AppError("paypal_failed", reason);
}

/** A sample share moves locally: no PayPal call is possible for it. */
async function moveSample(
  deps: HoldDeps,
  contractId: string,
  share: ShareRow,
  to: "kept" | "released",
): Promise<void> {
  const version = await withTransaction(deps.pool, async (client) => {
    await lockContractRow(client, contractId);
    if (to === "kept") await markKept(client, share.id, null);
    else await setShareStatus(client, share.id, "released");
    const detail =
      to === "kept"
        ? `${share.displayName}'s share was captured.`
        : `${share.displayName}'s hold was released.`;
    const type = to === "kept" ? "capture_completed" : "hold_released";
    await insertEvent(client, { contractId, shareId: share.id, type, detail });
    return touchContract(client, contractId);
  });
  notify(deps, contractId, version, [share.id]);
}

/** Captures one hold. A definite refusal first checks the order, because a capture may already exist (a replay). */
async function captureOne(deps: HoldDeps, contractId: string, share: ShareRow): Promise<void> {
  if (share.moneySource === "sample") return moveSample(deps, contractId, share, "kept");
  const authorizationId = authorizationOf(share);
  const request = captureAuthorizationRequest({
    authorizationId,
    shareId: share.id,
    amountCents: share.amountCents,
  });
  const operationId = await startCall(deps, contractId, share, "capture", request);
  const result = await deps.paypal.captureAuthorization(request);
  const name = share.displayName;

  if (result.outcome === "completed") {
    return finishCall(deps, contractId, share, { operationId, result, read: null }, async (client) => {
      await markKept(client, share.id, result.value.captureId);
      const detail = `${name}'s share was captured.`;
      await insertEvent(client, { contractId, shareId: share.id, type: "capture_completed", detail });
    });
  }
  if (result.outcome === "unknown")
    return pauseOnUnknown(deps, contractId, share, { operationId, result }, "capture_unknown");
  if (result.status === null) return pauseUnsent(deps, contractId, share, { operationId, result });

  const readRequest = getOrderRequest(share.orderId ?? "");
  const fact = await deps.paypal.getOrder(readRequest);
  const read: Read = { kind: "get_order", request: readRequest, result: fact };
  // Without a readable order we cannot tell a refusal from a capture that already happened, so sync decides.
  if (fact.outcome !== "completed") {
    const unclear = { operationId, result: { ...result, outcome: "unknown" as const } };
    return pauseOnUnknown(deps, contractId, share, unclear, "capture_unknown");
  }
  const existing = fact.value.capture;
  if (existing && (existing.status === "COMPLETED" || existing.status === "PENDING")) {
    return finishCall(deps, contractId, share, { operationId, result, read }, async (client) => {
      await markKept(client, share.id, existing.id);
      const detail = `${name}'s share was captured.`;
      await insertEvent(client, { contractId, shareId: share.id, type: "capture_completed", detail });
    });
  }
  const reason = reasons.captureRefused(name);
  await finishCall(deps, contractId, share, { operationId, result, read }, async (client, contract) => {
    await setShareStatus(client, share.id, "held");
    await setShareStatus(client, share.id, "capture_failed");
    await insertEvent(client, { contractId, shareId: share.id, type: "capture_refused", detail: reason });
    await block(client, contract, reason);
  });
  throw new AppError("capture_refused", reason);
}

/** Releases one hold. A definite refusal checks the authorization, because it may already be gone (a replay). */
async function releaseOne(deps: HoldDeps, contractId: string, share: ShareRow): Promise<void> {
  if (share.moneySource === "sample") return moveSample(deps, contractId, share, "released");
  const authorizationId = authorizationOf(share);
  const request = voidAuthorizationRequest(authorizationId);
  const operationId = await startCall(deps, contractId, share, "void", request);
  const result = await deps.paypal.voidAuthorization(request);
  const name = share.displayName;
  const release = async (client: PoolClient) => {
    await setShareStatus(client, share.id, "released");
    const detail = `${name}'s hold was released.`;
    await insertEvent(client, { contractId, shareId: share.id, type: "hold_released", detail });
  };

  if (result.outcome === "completed")
    return finishCall(deps, contractId, share, { operationId, result, read: null }, release);
  if (result.outcome === "unknown")
    return pauseOnUnknown(deps, contractId, share, { operationId, result }, "release_unknown");
  if (result.status === null) return pauseUnsent(deps, contractId, share, { operationId, result });

  const readRequest = getAuthorizationRequest(authorizationId);
  const fact = await deps.paypal.getAuthorization(readRequest);
  const read: Read = { kind: "get_authorization", request: readRequest, result: fact };
  const gone =
    fact.outcome === "completed" && (fact.value.status === "VOIDED" || fact.value.status === "EXPIRED");
  if (gone) return finishCall(deps, contractId, share, { operationId, result, read }, release);

  const reason = reasons.voidRefused(name);
  await finishCall(deps, contractId, share, { operationId, result, read }, async (client, contract) => {
    await setShareStatus(client, share.id, "held");
    await block(client, contract, reason);
  });
  throw new AppError("paypal_failed", reason);
}

/** Closes the plan once every share has reached the end of its wave. */
async function finishWave(deps: HoldDeps, contractId: string, wave: Wave): Promise<void> {
  const done = await withTransaction(deps.pool, async (client) => {
    await lockContractRow(client, contractId);
    const terms = confirmedTerms(await findById(client, contractId));
    const shares = await listForContract(client, contractId);
    const target = wave === "keep" ? "kept" : "released";
    const finished =
      wave === "keep"
        ? shares.every((share) => share.status === "kept")
        : !shares.some((share) => share.status === "held" || share.status.endsWith("_unknown"));
    if (!finished || terms.contract.status === target) return null;

    const reason = wave === "keep" ? reasons.kept(terms.headcount) : releaseReason(terms, shares);
    const type = wave === "keep" ? "contract_kept" : "contract_released";
    await insertEvent(client, { contractId, type, detail: reason });
    const version = await setResolution(client, contractId, { status: target, reason });
    return { version, shareIds: shares.map((share) => share.id) };
  });
  if (done) notify(deps, contractId, done.version, done.shareIds);
}

function releaseReason({ contract, headcount, demoNow }: Terms, shares: ShareRow[]): string {
  const held = shares.filter((share) => share.status === "released").length;
  const graceEnded =
    contract.graceName !== null && contract.graceUntil !== null && demoNow >= contract.graceUntil;
  return graceEnded && contract.graceName
    ? reasons.releasedAtGraceEnd(held, headcount, contract.graceName)
    : reasons.releasedAtDeadline(held, headcount);
}

/** Runs the rule once. The caller holds the contract lock. Throws the 409 or 502 that stopped it, after saving why. */
export async function runResolve(deps: HoldDeps, contractId: string): Promise<void> {
  const step = await withTransaction(deps.pool, async (client) => {
    const loaded = await load(client, contractId);
    return { ...(await applyDecision(client, loaded)), shareIds: loaded.shares.map((share) => share.id) };
  });
  if (step.version !== null) notify(deps, contractId, step.version, step.shareIds);
  if (step.error) throw step.error;
  if (!step.wave) return;

  const held = (await listForContract(deps.pool, contractId)).filter((share) => share.status === "held");
  if (held.some((share) => share.moneySource === "sandbox") && !paypalWritesOpen(deps.env)) {
    throw new AppError("paypal_disabled", "PayPal is turned off right now, so Foldback sent nothing.");
  }
  for (const share of held) {
    if (step.wave === "keep") await captureOne(deps, contractId, share);
    else await releaseOne(deps, contractId, share);
  }
  await finishWave(deps, contractId, step.wave);
}

/** The hold that completes the group resolves in the same request. Its own reply never fails because of the plan. */
export async function resolveAfterHold(deps: HoldDeps, contractId: string): Promise<void> {
  try {
    await runResolve(deps, contractId);
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
  }
}
