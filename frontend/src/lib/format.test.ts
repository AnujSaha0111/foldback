import { formatMoney, formatMoment } from "./format";

describe("formatMoney", () => {
  it("writes whole cents as dollars", () => {
    expect(formatMoney(8000)).toBe("$80.00");
    expect(formatMoney(5)).toBe("$0.05");
    expect(formatMoney(123456)).toBe("$1,234.56");
  });
});

describe("formatMoment", () => {
  const iso = "2026-11-07T02:00:00.000Z";

  it("writes the full form in the plan's own zone", () => {
    expect(formatMoment(iso, "America/Los_Angeles")).toBe("Fri 6 Nov 2026, 6:00pm PST");
  });

  it("writes the short form without the year and with the generic zone", () => {
    expect(formatMoment(iso, "America/Los_Angeles", true)).toBe("Fri 6 Nov, 6:00pm PT");
  });

  it("moves the day with the zone", () => {
    expect(formatMoment(iso, "Asia/Kolkata")).toMatch(/^Sat 7 Nov 2026, 7:30am /);
  });
});
