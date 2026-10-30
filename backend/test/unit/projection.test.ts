import { projectScheduler } from "../../src/domain/projection";
import type { ProjectionInput } from "../../src/domain/projection";
import { SHARE_STATUSES } from "../../src/shared/statuses";

const deadlineAt = new Date("2026-11-07T02:00:00Z");
const graceUntil = new Date("2026-11-10T02:00:00Z");

function input(overrides: Partial<ProjectionInput> = {}): ProjectionInput {
  return {
    timezone: "America/Los_Angeles",
    status: "active",
    deadlineAt,
    graceUntil,
    demoNow: new Date("2026-11-07T00:00:00Z"),
    shares: SHARE_STATUSES.map((status) => ({
      id: `shr_${status}`,
      displayName: status,
      isGraceSubject: false,
      status,
      moneySource: "sample",
      authorizationId: null,
      captureId: null,
    })),
    ...overrides,
  };
}

const bar = (projection: ReturnType<typeof projectScheduler>, status: string) =>
  projection.events.find((e) => e.status === status);

describe("projectScheduler", () => {
  it("gives every share status a bar inside the window", () => {
    const projection = projectScheduler(input());
    expect(projection.events).toHaveLength(SHARE_STATUSES.length);
    for (const event of projection.events) {
      expect(Date.parse(event.startDate)).toBeGreaterThanOrEqual(Date.parse(projection.start));
      expect(Date.parse(event.endDate)).toBeLessThanOrEqual(Date.parse(projection.end));
      expect(Date.parse(event.startDate)).toBeLessThanOrEqual(Date.parse(event.endDate));
    }
  });

  it("follows the span table for the outcome states", () => {
    const projection = projectScheduler(input());
    expect(bar(projection, "kept")).toMatchObject({
      startDate: "2026-11-06T17:00:00-08:00",
      endDate: projection.end,
    });
    expect(bar(projection, "released")).toMatchObject({
      startDate: "2026-11-09T18:00:00-08:00",
      endDate: projection.end,
      cls: "fb-released",
    });
    expect(bar(projection, "capture_unknown")).toMatchObject({
      startDate: "2026-11-06T18:00:00-08:00",
      endDate: "2026-11-07T00:00:00-08:00",
      eventColor: "red",
    });
    expect(bar(projection, "authorize_unknown")).toMatchObject({
      startDate: "2026-11-06T16:00:00-08:00",
      endDate: "2026-11-06T20:00:00-08:00",
    });
  });

  it("extends the person the plan is waiting on, and the holds, to the grace end while in grace", () => {
    const shares = input().shares.map((s) => ({ ...s, isGraceSubject: s.status === "waiting" }));
    const projection = projectScheduler(input({ status: "grace", shares }));
    expect(bar(projection, "waiting")?.endDate).toBe("2026-11-09T18:00:00-08:00");
    expect(bar(projection, "held")?.endDate).toBe("2026-11-09T18:00:00-08:00");
  });

  it("uses the deadline for release bars and ends the window two days after it when there is no grace", () => {
    const projection = projectScheduler(input({ graceUntil: null }));
    expect(projection.end).toBe("2026-11-08T20:00:00-08:00");
    expect(bar(projection, "released")?.startDate).toBe("2026-11-06T18:00:00-08:00");
    expect(projection.timeRanges.map((t) => t.id)).toEqual(["deadline", "now"]);
  });

  it("keeps the PayPal id for sandbox rows only, preferring the capture", () => {
    const shares = [
      { ...input().shares[0]!, moneySource: "sandbox" as const, authorizationId: "AUTH", captureId: "CAP" },
      { ...input().shares[0]!, id: "shr_b", moneySource: "sample" as const, authorizationId: "AUTH" },
    ];
    const projection = projectScheduler(input({ shares }));
    expect(projection.events.map((e) => e.paypalId)).toEqual(["CAP", null]);
  });
});
