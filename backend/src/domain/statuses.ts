import type { ShareStatus } from "../shared/statuses";

export * from "../shared/statuses";

/** A share in one of these can still be paid, if the contract's rules allow it (see payable). */
export const OPEN_SHARE_STATUSES: readonly ShareStatus[] = ["waiting", "checkout_open", "declined"];
