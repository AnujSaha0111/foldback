import { isPayable, payRefusal } from "../../src/domain/payable";
import type { PayableContract, PayableShare } from "../../src/domain/payable";
import { SHARE_STATUSES } from "../../src/domain/statuses";

const DEADLINE = new Date("2026-11-07T02:00:00Z");
const GRACE_END = new Date("2026-11-10T02:00:00Z");
const BEFORE = new Date("2026-11-07T00:00:00Z");
const AFTER_DEADLINE = new Date("2026-11-08T00:00:00Z");

function contract(overrides: Partial<PayableContract> = {}): PayableContract {
  return {
    status: "active",
    direction: null,
    demoNow: BEFORE,
    deadlineAt: DEADLINE,
    graceUntil: GRACE_END,
    ...overrides,
  };
}
function share(overrides: Partial<PayableShare> = {}): PayableShare {
  return { status: "waiting", isGraceSubject: false, moneySource: "sandbox", ...overrides };
}

describe("isPayable", () => {
  it("allows an open share on an active contract before the deadline", () => {
    for (const status of ["waiting", "checkout_open", "declined"] as const) {
      expect(isPayable(contract(), share({ status }))).toBe(true);
    }
  });

  it("refuses every other share status", () => {
    const open = new Set(["waiting", "checkout_open", "declined"]);
    for (const status of SHARE_STATUSES.filter((s) => !open.has(s))) {
      expect(isPayable(contract(), share({ status }))).toBe(false);
    }
  });

  it("refuses at and after the deadline, using the demo clock", () => {
    expect(isPayable(contract({ demoNow: DEADLINE }), share())).toBe(false);
    expect(isPayable(contract({ demoNow: AFTER_DEADLINE }), share())).toBe(false);
  });

  it("refuses once a decision exists", () => {
    expect(isPayable(contract({ direction: "keep" }), share())).toBe(false);
    expect(isPayable(contract({ direction: "release" }), share())).toBe(false);
  });

  it("refuses sample rows, because no PayPal call is possible for them", () => {
    expect(isPayable(contract(), share({ moneySource: "sample" }))).toBe(false);
  });

  it("in grace, allows only the grace person, until the grace end", () => {
    const grace = contract({ status: "grace", demoNow: AFTER_DEADLINE });
    expect(isPayable(grace, share({ isGraceSubject: true }))).toBe(true);
    expect(isPayable(grace, share({ isGraceSubject: false }))).toBe(false);
    expect(isPayable({ ...grace, demoNow: GRACE_END }, share({ isGraceSubject: true }))).toBe(false);
  });

  it("refuses on every other contract status", () => {
    for (const status of [
      "extracting",
      "needs_clarification",
      "awaiting_confirmation",
      "capturing",
      "kept",
      "releasing",
      "released",
      "blocked",
    ] as const) {
      expect(isPayable(contract({ status }), share())).toBe(false);
    }
  });

  it("refuses when the clock or the deadline is missing", () => {
    expect(isPayable(contract({ demoNow: null }), share())).toBe(false);
    expect(isPayable(contract({ deadlineAt: null }), share())).toBe(false);
  });
});

describe("payRefusal", () => {
  it("has no objection to a payable share", () => {
    for (const status of ["waiting", "checkout_open", "declined"] as const) {
      expect(payRefusal(contract(), share({ status }))).toBeNull();
    }
  });

  it("names a sample row first, whatever else is true", () => {
    const row = share({ moneySource: "sample", status: "kept" });
    expect(payRefusal(contract({ status: "kept", direction: "keep" }), row)).toBe("sample_row");
  });

  it("names unknown money even on a closed plan", () => {
    for (const status of ["authorize_unknown", "capture_unknown", "void_unknown"] as const) {
      expect(payRefusal(contract({ status: "blocked", direction: "keep" }), share({ status }))).toBe(
        "money_unknown",
      );
    }
  });

  it("calls a plan closed once a decision exists", () => {
    expect(payRefusal(contract({ status: "releasing", direction: "release" }), share())).toBe(
      "contract_closed",
    );
    expect(payRefusal(contract({ status: "kept" }), share())).toBe("contract_closed");
    expect(payRefusal(contract({ status: "released" }), share())).toBe("contract_closed");
  });

  it("says a held share is held, not unpayable", () => {
    expect(payRefusal(contract(), share({ status: "held" }))).toBe("share_already_held");
  });

  it("refuses an expired share, a late one, and anyone but the grace person in grace", () => {
    const grace = contract({ status: "grace", demoNow: AFTER_DEADLINE });
    expect(payRefusal(contract(), share({ status: "expired" }))).toBe("share_not_payable");
    expect(payRefusal(contract({ demoNow: DEADLINE }), share())).toBe("share_not_payable");
    expect(payRefusal(grace, share())).toBe("share_not_payable");
    expect(payRefusal(grace, share({ isGraceSubject: true }))).toBeNull();
  });
});
