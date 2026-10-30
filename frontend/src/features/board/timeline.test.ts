import { buildTimeline, dayStart } from "./timeline";

const LA = "America/Los_Angeles";

describe("dayStart", () => {
  it("finds local midnight in the plan's time zone", () => {
    // Fri 6 Nov 2026, 4:00pm PST is 00:00 UTC on the 7th; its day started at 08:00 UTC on the 6th.
    expect(new Date(dayStart(Date.parse("2026-11-07T00:00:00.000Z"), LA)).toISOString()).toBe(
      "2026-11-06T08:00:00.000Z",
    );
  });
});

describe("buildTimeline", () => {
  const timeline = buildTimeline({
    timeZone: LA,
    now: "2026-11-07T00:00:00.000Z",
    deadline: "2026-11-07T02:00:00.000Z",
    graceUntil: "2026-11-10T02:00:00.000Z",
  });

  it("runs from two days before now to two days after the grace end", () => {
    expect(timeline.days.map((day) => day.label)).toEqual([
      "Wed 4",
      "Thu 5",
      "Fri 6",
      "Sat 7",
      "Sun 8",
      "Mon 9",
      "Tue 10",
    ]);
    expect(timeline.days.filter((day) => day.isToday).map((day) => day.label)).toEqual(["Fri 6"]);
  });

  it("places moments across it, clamped to the edges", () => {
    // Fri 6, 6:00pm is 2 days and 18 hours into a 7-day board.
    expect(timeline.at("2026-11-07T02:00:00.000Z")).toBeCloseTo(2.75 / 7, 5);
    expect(timeline.at("2020-01-01T00:00:00.000Z")).toBe(0);
    expect(timeline.at("2030-01-01T00:00:00.000Z")).toBe(1);
  });
});
