import type { ContractStatus, ShareStatus } from "@/types/generated/statuses";

/** The six looks a status can have. Each is a word on a fill or an outline (docs/spec/ui.md, Status). */
export type Tone = "waiting" | "held" | "kept" | "released" | "failed" | "attention";

export interface StatusView {
  label: string;
  tone: Tone;
}

/**
 * The one place that says which word and which look each status gets. The tag, the board bar, the person card and
 * the Pay page all read it. The records are typed by the shared status lists, so a status added to the backend
 * and forgotten here stops the build.
 */
export const SHARE_STATUS_VIEW: Record<ShareStatus, StatusView> = {
  waiting: { label: "Waiting", tone: "waiting" },
  checkout_open: { label: "Paying…", tone: "waiting" },
  declined: { label: "Checkout closed", tone: "waiting" },
  authorize_unknown: { label: "Hold unknown", tone: "failed" },
  held: { label: "Held", tone: "held" },
  capture_unknown: { label: "Capture unknown", tone: "failed" },
  kept: { label: "Kept", tone: "kept" },
  capture_failed: { label: "Capture refused", tone: "failed" },
  void_unknown: { label: "Release unknown", tone: "failed" },
  released: { label: "Released", tone: "released" },
  expired: { label: "Missed deadline", tone: "waiting" },
};

export const CONTRACT_STATUS_VIEW: Record<ContractStatus, StatusView> = {
  extracting: { label: "Reading", tone: "waiting" },
  needs_clarification: { label: "Needs an answer", tone: "attention" },
  awaiting_confirmation: { label: "Waiting to confirm", tone: "waiting" },
  active: { label: "Collecting", tone: "held" },
  grace: { label: "In grace", tone: "attention" },
  capturing: { label: "Capturing", tone: "held" },
  kept: { label: "Kept", tone: "kept" },
  releasing: { label: "Releasing", tone: "held" },
  released: { label: "Released", tone: "released" },
  blocked: { label: "Paused", tone: "attention" },
};
