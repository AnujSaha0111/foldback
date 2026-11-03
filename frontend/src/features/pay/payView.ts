import { formatMoment, formatMoney } from "@/lib/format";
import type { PublicShare } from "@/types/generated/api-types";
import { UNCLEAR_RESULT } from "@/types/generated/rules";
import { UNKNOWN_SHARE_STATUSES } from "@/types/generated/statuses";
import type { ShareStatus } from "@/types/generated/statuses";

export interface PayView {
  /** The sentence for this state, if it has one. */
  message: string | null;
  /** The plan is over for this person: the message replaces the condition and reads as the headline. */
  final: boolean;
  action: { label: string; help: string } | null;
}

const OVER: Partial<Record<ShareStatus, string>> = {
  kept: "Everyone paid. Your share was captured.",
  released: "The group didn't make it, so your hold was released. You were not charged.",
  capture_failed: "PayPal refused this capture, so nothing was taken for your share.",
};

const note = (message: string): PayView => ({ message, final: false, action: null });

/** What the page says and offers. Reads the server's `status` and `payable`, and decides nothing about money. */
export function payView(share: PublicShare): PayView {
  if (share.money_source === "sample") return note("This is a sample plan. No PayPal payment is possible.");
  const over = OVER[share.status];
  if (over) return { message: over, final: true, action: null };
  if (UNKNOWN_SHARE_STATUSES.includes(share.status)) return note(UNCLEAR_RESULT);
  if (share.status === "held") {
    return note(`Your ${formatMoney(share.amount_cents)} is held. You'll only be charged if everyone pays.`);
  }
  if (!share.payable) {
    return {
      message: "The deadline passed before this share was held. Nothing was charged.",
      final: true,
      action: null,
    };
  }
  return {
    message: share.status === "declined" ? "Checkout closed. Nothing was held." : null,
    final: false,
    action:
      share.status === "checkout_open"
        ? { label: "Continue in PayPal", help: "Your checkout is still open." }
        : { label: "Hold my share with PayPal", help: "You approve in a PayPal window. No card form here." },
  };
}

/** The sentence under "This is a hold, not a charge." The grace person gets their own, later date. */
export function conditionText(share: PublicShare): string {
  const when = (iso: string) => formatMoment(iso, share.timezone, true);
  const everyone = `It's only taken if all ${share.headcount} people pay`;
  const otherwise = "Otherwise it's released and you pay nothing.";
  return share.is_grace_subject && share.grace_until
    ? `${everyone}. You have until ${when(share.grace_until)}. ${otherwise}`
    : `${everyone} by ${when(share.deadline_at)}. ${otherwise}`;
}

const NAMES = new Intl.ListFormat("en-US", { style: "long", type: "conjunction" });

/** "With Alex Chen, Sam Ortiz, and Jordan Lee", or nothing for a plan of one. */
export function withOthers(names: string[]): string | null {
  return names.length ? `With ${NAMES.format(names)}` : null;
}
