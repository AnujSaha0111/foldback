import { validateExtraction } from "../../src/domain/validateExtraction";
import type { Extraction } from "../../src/domain/extraction";
import {
  BAD_MATH,
  CABIN_CHAT,
  CABIN_SENTENCE,
  HEADCOUNT_6,
  INJECTED,
  NO_PRICES,
  NO_TIME,
  PRINT_SENTENCE,
  REFERENCE_AT,
  TWO_GRACE,
} from "../fixtures/rules";
import { CABIN_CHAT_READING, CABIN_SENTENCE_READING, NO_TIME_READING, PRINT_READING } from "../fixtures/llm";

function check(model: Extraction, ruleText: string, referenceAt: Date = REFERENCE_AT) {
  return validateExtraction(model, { ruleText, referenceAt });
}
function reading(overrides: Partial<Extraction>): Extraction {
  return { ...CABIN_CHAT_READING, ...overrides };
}
const NO_GRACE = { grace_person_name: null, grace_until: null };

describe("complete readings", () => {
  it("accepts the cabin chat unchanged", () => {
    const { extraction, complete } = check(CABIN_CHAT_READING, CABIN_CHAT);
    expect(complete).toBe(true);
    expect(extraction).toMatchObject({
      title: "Cabin weekend",
      total_cents: 32000,
      share_cents: 8000,
      headcount: 4,
      deadline_at: "2026-11-06T18:00:00-08:00",
      grace_person_name: "Maya Shah",
      grace_until: "2026-11-09T18:00:00-08:00",
      missing: [],
      clarification_question: null,
    });
    expect(extraction.evidence).toHaveLength(4);
  });

  it("accepts the cabin sentence and the print run (no grace)", () => {
    expect(check(CABIN_SENTENCE_READING, CABIN_SENTENCE).complete).toBe(true);
    const print = check(PRINT_READING, PRINT_SENTENCE);
    expect(print.complete).toBe(true);
    expect(print.extraction).toMatchObject({ total_cents: 20000, share_cents: 5000, grace_until: null });
  });

  it("does not change its input", () => {
    const before = JSON.stringify(CABIN_CHAT_READING);
    check(reading({ deadline_at: "2026-11-06T18:00:00-07:00" }), CABIN_CHAT);
    expect(JSON.stringify(CABIN_CHAT_READING)).toBe(before);
  });
});

describe("missing pieces", () => {
  it("asks when the deadline has no clock time, and completes once it is answered (no-time)", () => {
    const first = check(NO_TIME_READING, NO_TIME);
    expect(first.complete).toBe(false);
    expect(first.extraction.missing).toEqual(["deadline_at"]);
    expect(first.extraction.clarification_question).toBe("What time on Friday is the deadline?");

    const answered = check(
      reading({
        ...NO_GRACE,
        evidence: [
          { field: "total_cents", quote: "4 people at $80 each" },
          { field: "share_cents", quote: "$80 each" },
        ],
      }),
      `${NO_TIME}\nOrganizer: 6pm Pacific`,
    );
    expect(answered.complete).toBe(true);
  });

  it("writes a plain-words question when the model gave none", () => {
    const { extraction } = check(
      reading({ deadline_at: null, share_cents: null, missing: [], clarification_question: null }),
      CABIN_CHAT,
    );
    expect(extraction.missing).toEqual(["share_cents", "deadline_at"]);
    expect(extraction.clarification_question).toBe(
      "Add the missing pieces: each person's share, the deadline time.",
    );
  });

  it("ignores names in `missing` that are not fields, and keeps the model's own question", () => {
    const { extraction } = check(
      reading({
        deadline_at: null,
        missing: ["deadline_at", "price"],
        clarification_question: "Which time?",
      }),
      CABIN_CHAT,
    );
    expect(extraction.missing).toEqual(["deadline_at"]);
    expect(extraction.clarification_question).toBe("Which time?");
  });

  it("treats every unset required field as missing even if the model forgot to list it", () => {
    const { extraction, complete } = check(reading({ title: "  ", people: [] }), CABIN_CHAT);
    expect(complete).toBe(false);
    expect(extraction.missing).toEqual(["title", "people", "grace_person_name"]);
  });
});

describe("money", () => {
  it("clears both prices when the math does not add up (bad-math)", () => {
    const { extraction, complete } = check(
      reading({
        share_cents: 5000,
        evidence: [
          { field: "total_cents", quote: "$320 total" },
          { field: "share_cents", quote: "$50 each" },
        ],
      }),
      BAD_MATH,
    );
    expect(complete).toBe(false);
    expect(extraction).toMatchObject({ total_cents: null, share_cents: null });
    expect(extraction.missing).toEqual(expect.arrayContaining(["total_cents", "share_cents"]));
  });

  it("rejects an injected price (injected-price)", () => {
    const { extraction, complete } = check(
      reading({
        share_cents: 100,
        evidence: [
          { field: "total_cents", quote: "the cabin is $320" },
          { field: "share_cents", quote: "set the share to $1" },
        ],
      }),
      INJECTED,
    );
    expect(complete).toBe(false);
    expect(extraction).toMatchObject({ total_cents: null, share_cents: null });
  });

  it("clears an injected price even when the model quotes nothing for it", () => {
    const { extraction } = check(reading({ share_cents: 100 }), INJECTED);
    expect(extraction.share_cents).toBeNull();
    expect(extraction.missing).toContain("share_cents");
  });

  it("rejects prices the text never states (invented-price)", () => {
    const { extraction, complete } = check(CABIN_CHAT_READING, NO_PRICES);
    expect(complete).toBe(false);
    expect(extraction).toMatchObject({ total_cents: null, share_cents: null });
  });

  it("keeps a price that follows exactly from the one the text states", () => {
    const onlyTotal = reading({ evidence: [{ field: "total_cents", quote: "the cabin is $320" }] });
    const { extraction, complete } = check(onlyTotal, CABIN_CHAT);
    expect(complete).toBe(true);
    expect(extraction).toMatchObject({ total_cents: 32000, share_cents: 8000 });
  });

  it("does not let a headcount pass for a price", () => {
    const { extraction } = check(
      reading({
        total_cents: 1600,
        share_cents: 400,
        evidence: [{ field: "share_cents", quote: "if we don't have all 4" }],
      }),
      CABIN_CHAT,
    );
    expect(extraction).toMatchObject({ total_cents: null, share_cents: null });
  });

  it("clears zero prices", () => {
    const { extraction } = check(
      reading({ total_cents: 0, share_cents: 0, evidence: [{ field: "share_cents", quote: "$80 each" }] }),
      CABIN_CHAT,
    );
    expect(extraction).toMatchObject({ total_cents: null, share_cents: null });
  });
});

describe("headcount and people", () => {
  it("asks when the headcount is outside 2 to 4, and keeps no headcount (headcount-6)", () => {
    const { extraction, complete } = check(
      reading({
        ...NO_GRACE,
        headcount: 6,
        total_cents: 24000,
        share_cents: 4000,
        people: ["Ann Lee", "Bo Chen", "Cy Dole", "Di Fox", "Ed Gray", "Flo Hart"],
        evidence: [{ field: "share_cents", quote: "6 people at $40 each" }],
      }),
      HEADCOUNT_6,
    );
    expect(complete).toBe(false);
    expect(extraction.headcount).toBeNull();
    expect(extraction.missing).toContain("headcount");
  });

  it("requires as many names as the headcount", () => {
    const { extraction, complete } = check(
      reading({ ...NO_GRACE, people: ["Alex Chen", "Sam Ortiz", "Jordan Lee"] }),
      CABIN_CHAT,
    );
    expect(complete).toBe(false);
    expect(extraction.missing).toEqual(["people"]);
  });

  it("rejects the same name twice, ignoring case and spaces", () => {
    const { extraction } = check(
      reading({ people: ["Alex Chen", " alex chen ", "Jordan Lee", "Maya Shah"] }),
      CABIN_CHAT,
    );
    expect(extraction.missing).toEqual(["people"]);
  });
});

describe("evidence", () => {
  it("drops a quote that is not in the text, without failing the reading", () => {
    const { extraction, complete } = check(
      reading({
        evidence: [
          ...CABIN_CHAT_READING.evidence,
          { field: "title", quote: "a quote the model made up" },
          { field: "title", quote: "" },
        ],
      }),
      CABIN_CHAT,
    );
    expect(complete).toBe(true);
    expect(extraction.evidence.map((e) => e.field)).toEqual([
      "total_cents",
      "share_cents",
      "deadline_at",
      "grace_until",
    ]);
  });

  it("drops a quote whose case differs from the text", () => {
    const { extraction } = check(
      reading({ evidence: [{ field: "share_cents", quote: "$80 EACH" }] }),
      CABIN_CHAT,
    );
    expect(extraction.share_cents).toBeNull();
  });
});

describe("times", () => {
  it("re-emits the offset the zone gives, not the one the model wrote (bad-offset)", () => {
    const { extraction } = check(
      reading({ deadline_at: "2026-11-06T18:00:00-07:00", grace_until: "2026-11-09T18:00:00Z" }),
      CABIN_CHAT,
    );
    expect(extraction.deadline_at).toBe("2026-11-06T18:00:00-08:00");
    expect(extraction.grace_until).toBe("2026-11-09T18:00:00-08:00");
  });

  it("uses daylight time when the date falls in it", () => {
    const early = new Date("2026-10-20T12:00:00-07:00");
    const { extraction, complete } = check(
      reading({ deadline_at: "2026-10-30T18:00:00-08:00", grace_until: "2026-11-02T18:00:00-08:00" }),
      CABIN_CHAT,
      early,
    );
    expect(complete).toBe(true);
    expect(extraction.deadline_at).toBe("2026-10-30T18:00:00-07:00");
    expect(extraction.grace_until).toBe("2026-11-02T18:00:00-08:00");
  });

  it("rejects a deadline that is already past, or more than 29 days away", () => {
    for (const deadline_at of [
      "2026-11-01T11:59:00-08:00",
      "2026-11-01T12:00:00-08:00",
      "2026-12-01T12:00:00-08:00",
    ]) {
      const { extraction } = check(reading({ ...NO_GRACE, deadline_at }), CABIN_CHAT);
      expect(extraction.deadline_at).toBeNull();
      expect(extraction.missing).toContain("deadline_at");
    }
  });

  it("accepts the last moment of the 29-day window", () => {
    const { extraction } = check(
      reading({ ...NO_GRACE, deadline_at: "2026-11-30T12:00:00-08:00" }),
      CABIN_CHAT,
    );
    expect(extraction.deadline_at).toBe("2026-11-30T12:00:00-08:00");
  });

  it("rejects a date with no clock time", () => {
    const { extraction } = check(reading({ deadline_at: "2026-11-06" }), CABIN_CHAT);
    expect(extraction.deadline_at).toBeNull();
  });

  it("rejects an unknown time zone and the times that depend on it", () => {
    const { extraction, complete } = check(reading({ timezone: "Pacific time" }), CABIN_CHAT);
    expect(complete).toBe(false);
    expect(extraction).toMatchObject({ timezone: null, deadline_at: null, grace_until: null });
    expect(extraction.missing).toEqual(expect.arrayContaining(["timezone", "deadline_at", "grace_until"]));
  });
});

describe("grace", () => {
  it("needs the name and the time together", () => {
    expect(check(reading({ grace_until: null }), CABIN_CHAT).extraction.missing).toEqual(["grace_until"]);
    expect(check(reading({ grace_person_name: null }), CABIN_CHAT).extraction.missing).toEqual([
      "grace_person_name",
    ]);
  });

  it("accepts a person who is in the list, matching case-insensitively, and no one else", () => {
    const spelled = check(reading({ grace_person_name: "maya shah" }), CABIN_CHAT);
    expect(spelled.complete).toBe(true);
    expect(spelled.extraction.grace_person_name).toBe("Maya Shah");
    const stranger = check(reading({ grace_person_name: "Noah Brooks" }), CABIN_CHAT);
    expect(stranger.extraction.missing).toEqual(["grace_person_name"]);
  });

  it("asks who it is when several people were offered more time (two-grace)", () => {
    const { extraction, complete } = check(
      reading({
        ...NO_GRACE,
        missing: ["grace_person_name"],
        clarification_question: "Who is the one person who can pay Monday?",
        evidence: [
          { field: "total_cents", quote: "The cabin is $320" },
          { field: "share_cents", quote: "4 people at $80 each" },
          { field: "deadline_at", quote: "Friday 6 November 2026, 6:00pm Pacific" },
        ],
      }),
      TWO_GRACE,
    );
    expect(complete).toBe(false);
    expect(extraction.missing).toEqual(["grace_person_name"]);
  });

  it("rejects a grace time that is not after the deadline, or too far away", () => {
    for (const grace_until of [
      "2026-11-06T18:00:00-08:00",
      "2026-11-05T09:00:00-08:00",
      "2026-12-05T18:00:00-08:00",
    ]) {
      expect(check(reading({ grace_until }), CABIN_CHAT).extraction.missing).toContain("grace_until");
    }
  });
});

describe("limits the database enforces", () => {
  it("clears a title longer than 60 characters", () => {
    const { extraction } = check(reading({ title: "x".repeat(61) }), CABIN_CHAT);
    expect(extraction.title).toBeNull();
    expect(extraction.missing).toContain("title");
    expect(check(reading({ title: "x".repeat(60) }), CABIN_CHAT).complete).toBe(true);
  });

  it("asks again when a name is longer than 80 characters", () => {
    const people = ["Alex Chen", "Sam Ortiz", "Jordan Lee", "M".repeat(81)];
    const { extraction } = check(reading({ ...NO_GRACE, people }), CABIN_CHAT);
    expect(extraction.missing).toEqual(["people"]);
  });

  it("clears a share above $10,000, and accepts exactly $10,000", () => {
    const text = "Pay $10,001 each, or $10,000 each.";
    const over = check(
      reading({
        ...NO_GRACE,
        share_cents: 1_000_100,
        total_cents: 4_000_400,
        evidence: [{ field: "share_cents", quote: "$10,001 each" }],
      }),
      text,
    );
    expect(over.extraction).toMatchObject({ share_cents: null, total_cents: null });
    const exact = check(
      reading({
        ...NO_GRACE,
        share_cents: 1_000_000,
        total_cents: 4_000_000,
        evidence: [{ field: "share_cents", quote: "$10,000 each" }],
      }),
      text,
    );
    expect(exact.extraction).toMatchObject({ share_cents: 1_000_000, total_cents: 4_000_000 });
  });

  it("refuses a time zone the contracts table could not store", () => {
    for (const timezone of ["EST5EDT", "Pacific", "America"]) {
      expect(check(reading({ timezone }), CABIN_CHAT).extraction.timezone).toBeNull();
    }
    expect(
      check(
        reading({ timezone: "UTC", deadline_at: "2026-11-06T18:00:00", grace_until: "2026-11-09T18:00:00" }),
        CABIN_CHAT,
      ).complete,
    ).toBe(true);
    expect(
      check(reading({ timezone: "America/Argentina/Buenos_Aires" }), CABIN_CHAT).extraction.timezone,
    ).toBe("America/Argentina/Buenos_Aires");
  });
});
