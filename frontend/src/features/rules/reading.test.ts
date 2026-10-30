import type { ApiExtraction } from "@/types/generated/api-types";
import { termsOf } from "@/types/generated/terms";
import { isQuestion, nextReading, quoteFor } from "./reading";

const complete: ApiExtraction = {
  title: "Cabin weekend",
  currency: "USD",
  total_cents: 32000,
  share_cents: 8000,
  headcount: 4,
  deadline_at: "2026-11-06T18:00:00-08:00",
  timezone: "America/Los_Angeles",
  grace_person_name: "Maya Shah",
  grace_until: "2026-11-09T18:00:00-08:00",
  people: ["Alex Chen", "Sam Ortiz", "Jordan Lee", "Maya Shah"],
  missing: [],
  clarification_question: null,
  evidence: [{ field: "title", quote: "the cabin" }],
};

const question = {
  status: 422,
  data: {
    error: "needs_clarification",
    message: "What time on Friday?",
    contract_id: "con_1",
    missing: ["deadline_at"],
    extraction: null,
  },
};

describe("nextReading", () => {
  it("moves to ready on a complete reading", () => {
    const next = nextReading({ data: { contract_id: "con_1", extraction: complete } }, { kind: "none" });
    expect(next).toEqual({ kind: "ready", contractId: "con_1", extraction: complete });
  });

  it("treats a 422 with a question as the next step", () => {
    expect(nextReading({ error: question }, { kind: "none" })).toEqual({
      kind: "question",
      contractId: "con_1",
      question: "What time on Friday?",
    });
  });

  it("stays put on a real failure", () => {
    const current = { kind: "question", contractId: "con_1", question: "When?" } as const;
    const limit = { status: 422, data: { error: "needs_clarification", message: "Start a new rule." } };
    expect(nextReading({ error: limit }, current)).toBe(current);
    expect(nextReading({ error: { status: "FETCH_ERROR" } }, current)).toBe(current);
  });
});

describe("isQuestion", () => {
  it("tells a question from an error", () => {
    expect(isQuestion(question)).toBe(true);
    expect(isQuestion({ status: 429, data: { error: "rate_limited", message: "Slow down." } })).toBe(false);
    expect(isQuestion(undefined)).toBe(false);
  });
});

describe("termsOf", () => {
  it("echoes only the terms, with nothing added", () => {
    expect(Object.keys(termsOf(complete) ?? {}).sort()).toEqual(
      [
        "currency",
        "deadline_at",
        "grace_person_name",
        "grace_until",
        "headcount",
        "people",
        "share_cents",
        "timezone",
        "title",
        "total_cents",
      ].sort(),
    );
  });

  it("refuses an incomplete reading", () => {
    expect(termsOf({ ...complete, deadline_at: null })).toBeNull();
    expect(termsOf({ ...complete, missing: ["headcount"] })).toBeNull();
  });
});

describe("quoteFor", () => {
  it("finds the quote for a field, or nothing", () => {
    expect(quoteFor(complete, "title")).toBe("the cabin");
    expect(quoteFor(complete, "people")).toBeNull();
  });
});
