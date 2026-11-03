import { OPEN_SHARE_STATUSES, UNKNOWN_SHARE_STATUSES } from "./statuses";
import type { ContractStatus, Direction, MoneySource, ShareStatus } from "./statuses";

// The rule, as pure code (docs/spec/architecture.md, "Resolve rules"). resolve.service executes the answer, and the
// agent's simulate_outcome runs the same function on a copy, so a simulation can never drift from the real thing.

export interface DecideContract {
  status: ContractStatus;
  direction: Direction | null;
  headcount: number;
  deadlineAt: Date;
  graceUntil: Date | null;
}

export interface DecideShare {
  id: string;
  displayName: string;
  status: ShareStatus;
  isGraceSubject: boolean;
  moneySource: MoneySource;
  /** A mutating PayPal call for this share has not settled, so its money may be moving. */
  openCall: boolean;
}

export type Decision =
  | { kind: "closed" }
  | { kind: "unknown"; who: string[] }
  | { kind: "capture_refused" }
  | { kind: "stay_active" }
  | { kind: "enter_grace"; expire: string[]; graceName: string }
  | { kind: "keep" }
  | { kind: "release"; expire: string[] };

/**
 * Shares to expire. One with a checkout still in flight is left alone: the database refuses to expire it, and once the
 * plan is decided its order can never be authorized anyway, so nobody can be charged.
 */
const expirable = (share: DecideShare) => OPEN_SHARE_STATUSES.includes(share.status) && !share.openCall;

/**
 * Decides what the plan does at `now`. An unknown or refused result pauses the plan only when the rule would move
 * money or end the collection: before the deadline, one friend's unclear result must not stop everyone else paying.
 */
export function decide(contract: DecideContract, shares: DecideShare[], now: Date): Decision {
  if (contract.status === "kept" || contract.status === "released") return { kind: "closed" };
  const rule = applyRule(contract, shares, now);
  if (rule.kind === "stay_active") return rule;

  const unknown = shares.filter((share) => UNKNOWN_SHARE_STATUSES.includes(share.status));
  if (unknown.length > 0) return { kind: "unknown", who: unknown.map((share) => share.displayName) };
  if (shares.some((share) => share.status === "capture_failed")) return { kind: "capture_refused" };
  return rule;
}

/** Steps 4 and 5 of the resolve rules: a decision already made, then everyone held, the deadline, and grace. */
function applyRule(contract: DecideContract, shares: DecideShare[], now: Date): Decision {
  const releaseAll = (): Decision => ({ kind: "release", expire: shares.filter(expirable).map((s) => s.id) });
  if (contract.direction === "keep") return { kind: "keep" };
  if (contract.direction === "release") return releaseAll();

  const held = shares.filter((share) => share.status === "held").length;
  if (held >= contract.headcount) return { kind: "keep" };
  if (now < contract.deadlineAt) return { kind: "stay_active" };
  return graceFor(contract, shares, held, now) ?? releaseAll();
}

/** Grace opens after the deadline only for the named person, only if their one payment would complete the group. */
function graceFor(contract: DecideContract, shares: DecideShare[], held: number, now: Date): Decision | null {
  const subject = shares.find((share) => share.isGraceSubject);
  if (subject === undefined || subject.status === "held" || contract.graceUntil === null) return null;
  if (now >= contract.graceUntil || held + 1 < contract.headcount) return null;
  const expire = shares.filter((share) => expirable(share) && !share.isGraceSubject).map((share) => share.id);
  return { kind: "enter_grace", expire, graceName: subject.displayName };
}
