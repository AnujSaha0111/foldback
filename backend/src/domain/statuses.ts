import type { ShareStatus } from "../shared/statuses";

export * from "../shared/statuses";

/** A PayPal call was sent and its answer was lost. The money stays reserved until a sync settles it. */
export const UNKNOWN_SHARE_STATUSES: readonly ShareStatus[] = [
  "authorize_unknown",
  "capture_unknown",
  "void_unknown",
];

/** A share in one of these can still be paid, if the contract's rules allow it (see payable). */
export const OPEN_SHARE_STATUSES: readonly ShareStatus[] = ["waiting", "checkout_open", "declined"];

export function isUnknownShareStatus(status: ShareStatus): boolean {
  return UNKNOWN_SHARE_STATUSES.includes(status);
}
