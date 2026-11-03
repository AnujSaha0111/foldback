import type { PublicShare } from "@/types/generated/api-types";
import { conditionText, payView, withOthers } from "./payView";

const share = (extra: Partial<PublicShare> = {}): PublicShare => ({
  share_id: "shr_1",
  contract_id: "con_1",
  display_name: "Maya Shah",
  title: "Cabin weekend",
  amount_cents: 8000,
  currency: "USD",
  headcount: 4,
  held_count: 3,
  deadline_at: "2026-11-07T02:00:00.000Z",
  grace_until: "2026-11-10T02:00:00.000Z",
  is_grace_subject: false,
  timezone: "America/Los_Angeles",
  demo_now: "2026-11-07T00:00:00.000Z",
  status: "waiting",
  contract_status: "active",
  money_source: "sandbox",
  payable: true,
  other_names: ["Alex Chen", "Sam Ortiz", "Jordan Lee"],
  ...extra,
});

describe("payView", () => {
  it("offers the hold to a payable share, even after a closed checkout", () => {
    for (const status of ["waiting", "declined"] as const) {
      expect(payView(share({ status })).action?.label).toBe("Hold my share with PayPal");
    }
  });

  it("says a closed checkout held nothing, and offers the hold again", () => {
    const view = payView(share({ status: "declined" }));
    expect(view.message).toBe("Checkout closed. Nothing was held.");
    expect(view.action?.label).toBe("Hold my share with PayPal");
  });

  it("offers to continue an open checkout", () => {
    expect(payView(share({ status: "checkout_open" })).action?.label).toBe("Continue in PayPal");
  });

  it("says the hold is in place, with the amount", () => {
    const view = payView(share({ status: "held", payable: false }));
    expect(view.message).toBe("Your $80.00 is held. You'll only be charged if everyone pays.");
    expect(view.action).toBeNull();
    expect(view.final).toBe(false);
  });

  it.each([
    ["kept", "Everyone paid. Your share was captured."],
    ["released", "The group didn't make it, so your hold was released. You were not charged."],
    ["capture_failed", "PayPal refused this capture, so nothing was taken for your share."],
    ["expired", "The deadline passed before this share was held. Nothing was charged."],
  ] as const)("ends the page on %s", (status, message) => {
    expect(payView(share({ status, payable: false }))).toEqual({ message, final: true, action: null });
  });

  it("never tells someone with an unclear result that nothing was charged", () => {
    for (const status of ["authorize_unknown", "capture_unknown", "void_unknown"] as const) {
      const view = payView(share({ status, payable: false }));
      expect(view.message).toBe(
        "PayPal did not return a clear result. Your share stays reserved while we check.",
      );
      expect(view.action).toBeNull();
    }
  });

  it("closes an open share once it is not payable", () => {
    const view = payView(share({ status: "waiting", payable: false }));
    expect(view.action).toBeNull();
    expect(view.message).toContain("The deadline passed");
  });

  it("offers nothing on a sample plan", () => {
    const view = payView(share({ money_source: "sample", payable: false }));
    expect(view.message).toBe("This is a sample plan. No PayPal payment is possible.");
    expect(view.action).toBeNull();
  });
});

describe("conditionText", () => {
  it("gives everyone the deadline", () => {
    expect(conditionText(share())).toBe(
      "It's only taken if all 4 people pay by Fri 6 Nov, 6:00pm PT. Otherwise it's released and you pay nothing.",
    );
  });

  it("gives the grace person their own date", () => {
    expect(conditionText(share({ is_grace_subject: true }))).toBe(
      "It's only taken if all 4 people pay. You have until Mon 9 Nov, 6:00pm PT. Otherwise it's released and you pay nothing.",
    );
  });
});

describe("withOthers", () => {
  it("names the others, and nobody for a plan of one", () => {
    expect(withOthers(["Alex Chen", "Sam Ortiz", "Jordan Lee"])).toBe(
      "With Alex Chen, Sam Ortiz, and Jordan Lee",
    );
    expect(withOthers([])).toBeNull();
  });
});
