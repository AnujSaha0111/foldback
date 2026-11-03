import { decide } from "../../src/domain/decide";
import type { DecideContract, DecideShare } from "../../src/domain/decide";
import type { Direction } from "../../src/domain/statuses";

const DEADLINE = new Date("2026-11-07T02:00:00Z");
const GRACE_END = new Date("2026-11-10T02:00:00Z");
const TIMES = {
  before: new Date("2026-11-07T00:00:00Z"),
  inGrace: new Date("2026-11-08T00:00:00Z"),
  afterGrace: new Date("2026-11-11T00:00:00Z"),
};

function contract(extra: Partial<DecideContract> = {}): DecideContract {
  return {
    status: "active",
    direction: null,
    headcount: 4,
    deadlineAt: DEADLINE,
    graceUntil: GRACE_END,
    ...extra,
  };
}

/** Four people, Maya last and the grace person. `held` of them hold, in seat order. */
function shares(held: number, extra: Partial<Record<number, Partial<DecideShare>>> = {}): DecideShare[] {
  return ["Alex", "Sam", "Jordan", "Maya"].map((name, i) => ({
    id: `s${i}`,
    displayName: name,
    status: i < held ? "held" : "waiting",
    isGraceSubject: name === "Maya",
    moneySource: "sandbox",
    openCall: false,
    ...extra[i],
  }));
}

describe("decide truth table (test 58)", () => {
  type Row = [
    time: keyof typeof TIMES,
    held: number,
    grace: boolean,
    direction: Direction | null,
    kind: string,
  ];
  const rows: Row[] = [
    ["before", 2, true, null, "stay_active"],
    ["before", 3, true, null, "stay_active"],
    ["before", 4, true, null, "keep"],
    ["inGrace", 2, true, null, "release"],
    ["inGrace", 3, true, null, "enter_grace"],
    ["inGrace", 4, true, null, "keep"],
    ["afterGrace", 3, true, null, "release"],
    ["afterGrace", 4, true, null, "keep"],
    ["inGrace", 3, false, null, "release"],
    ["before", 2, false, null, "stay_active"],
    ["afterGrace", 2, false, null, "release"],
    ["before", 2, true, "keep", "keep"],
    ["inGrace", 3, true, "release", "release"],
    ["afterGrace", 4, false, "release", "release"],
    ["before", 4, false, "keep", "keep"],
  ];

  it.each(rows)("at %s with %d held, grace %s, direction %s: %s", (time, held, grace, direction, kind) => {
    const c = contract({ direction, graceUntil: grace ? GRACE_END : null });
    const people = shares(held, grace ? {} : { 3: { isGraceSubject: false } });
    expect(decide(c, people, TIMES[time]).kind).toBe(kind);
  });
});

describe("decide", () => {
  it("is closed after kept or released", () => {
    expect(decide(contract({ status: "kept" }), shares(4), TIMES.before)).toEqual({ kind: "closed" });
    expect(decide(contract({ status: "released" }), shares(0), TIMES.before)).toEqual({ kind: "closed" });
  });

  it("enters grace for the named person only, and expires everyone else still open", () => {
    const decision = decide(contract(), shares(2, { 2: { status: "declined" } }), TIMES.inGrace);
    expect(decision).toEqual({ kind: "release", expire: ["s2", "s3"] });
    const grace = decide(contract(), shares(3), TIMES.inGrace);
    expect(grace).toEqual({ kind: "enter_grace", expire: [], graceName: "Maya" });
  });

  it("expires every open share on release, but never one with a checkout in flight", () => {
    const people = shares(1, { 2: { status: "checkout_open", openCall: true } });
    expect(decide(contract({ graceUntil: null }), people, TIMES.inGrace)).toEqual({
      kind: "release",
      expire: ["s1", "s3"],
    });
  });

  it("pauses on an unknown result only when money would move", () => {
    const people = shares(2, { 2: { status: "authorize_unknown" } });
    expect(decide(contract(), people, TIMES.before)).toEqual({ kind: "stay_active" });
    expect(decide(contract(), people, TIMES.afterGrace)).toEqual({ kind: "unknown", who: ["Jordan"] });
    expect(
      decide(contract({ direction: "keep" }), shares(3, { 3: { status: "capture_unknown" } }), TIMES.before),
    ).toEqual({ kind: "unknown", who: ["Maya"] });
  });

  it("stays paused after a refused capture", () => {
    const people = shares(3, { 3: { status: "capture_failed" } });
    expect(decide(contract({ status: "blocked", direction: "keep" }), people, TIMES.before)).toEqual({
      kind: "capture_refused",
    });
  });

  it("never offers grace when the grace person's payment would not complete the group", () => {
    expect(decide(contract(), shares(2), TIMES.inGrace).kind).toBe("release");
  });

  it("keeps when everyone is held, even before the deadline", () => {
    expect(decide(contract(), shares(4), TIMES.before)).toEqual({ kind: "keep" });
  });
});
