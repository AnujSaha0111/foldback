// The status lists, shared with the frontend. A test keeps these in step with the database CHECK constraints
// and the transition tables, so a status added in one place and forgotten in another fails the build.

export const CONTRACT_STATUSES = [
  "extracting",
  "needs_clarification",
  "awaiting_confirmation",
  "active",
  "grace",
  "capturing",
  "kept",
  "releasing",
  "released",
  "blocked",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const SHARE_STATUSES = [
  "waiting",
  "checkout_open",
  "authorize_unknown",
  "held",
  "capture_unknown",
  "kept",
  "capture_failed",
  "void_unknown",
  "released",
  "expired",
  "declined",
] as const;
export type ShareStatus = (typeof SHARE_STATUSES)[number];

/** Shares whose hold is in place or already acted on, so they count toward "held so far". */
export const HOLDING_SHARE_STATUSES: readonly ShareStatus[] = [
  "held",
  "kept",
  "capture_unknown",
  "capture_failed",
];

/** PayPal has not said how a call ended, so the share stays reserved until sync asks. */
export const UNKNOWN_SHARE_STATUSES: readonly ShareStatus[] = [
  "authorize_unknown",
  "capture_unknown",
  "void_unknown",
];

export type Direction = "keep" | "release";
export type MoneySource = "sample" | "sandbox";
