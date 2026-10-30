import {
  authorizationWindowEnd,
  describeInstant,
  isValidZone,
  resolveLocalTime,
  toOffsetIso,
} from "../../src/domain/time";

const ZONE = "America/Los_Angeles";

describe("resolveLocalTime", () => {
  it("keeps the wall-clock time and takes the offset from the zone, not from the model", () => {
    const winter = resolveLocalTime("2026-11-06T18:00:00-07:00", ZONE);
    expect(winter && toOffsetIso(winter)).toBe("2026-11-06T18:00:00-08:00");
    const summer = resolveLocalTime("2026-10-30T18:00:00-08:00", ZONE);
    expect(summer && toOffsetIso(summer)).toBe("2026-10-30T18:00:00-07:00");
  });

  it("accepts a local time with no offset, and with Z", () => {
    const bare = resolveLocalTime("2026-11-06T18:00", ZONE);
    expect(bare && toOffsetIso(bare)).toBe("2026-11-06T18:00:00-08:00");
    const zulu = resolveLocalTime("2026-11-06T18:00:00Z", ZONE);
    expect(zulu && toOffsetIso(zulu)).toBe("2026-11-06T18:00:00-08:00");
  });

  it("rejects a date without a clock time, and text that is not a date", () => {
    expect(resolveLocalTime("2026-11-06", ZONE)).toBeNull();
    expect(resolveLocalTime("Friday evening", ZONE)).toBeNull();
    expect(resolveLocalTime("", ZONE)).toBeNull();
  });

  it("rejects a time that does not exist because clocks went forward", () => {
    expect(resolveLocalTime("2026-03-08T02:30:00", ZONE)).toBeNull();
  });
});

describe("zones and windows", () => {
  it("accepts IANA names only", () => {
    expect(isValidZone("America/Los_Angeles")).toBe(true);
    expect(isValidZone("Europe/London")).toBe(true);
    expect(isValidZone("UTC")).toBe(true);
    expect(isValidZone("EST5EDT")).toBe(false);
    expect(isValidZone("Pacific time")).toBe(false);
    expect(isValidZone("")).toBe(false);
  });

  it("describes an instant the way the prompt shows it", () => {
    expect(describeInstant(new Date("2026-11-01T12:00:00-08:00"), ZONE)).toBe(
      "Sunday 1 November 2026, 12:00 PM PST",
    );
  });

  it("ends the authorization window 29 days after the reference time", () => {
    const end = authorizationWindowEnd(new Date("2026-11-01T20:00:00Z"));
    expect(end.toUTC().toISO()).toBe("2026-11-30T20:00:00.000Z");
  });
});
