import type { Extraction } from "../../src/domain/extraction";

/** A complete, correct reading of the cabin chat, the way a good model would return it. */
export const CABIN_CHAT_READING: Extraction = {
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
  evidence: [
    { field: "total_cents", quote: "the cabin is $320" },
    { field: "share_cents", quote: "$80 each" },
    { field: "deadline_at", quote: "everyone else by friday 6pm pacific" },
    { field: "grace_until", quote: "Maya you can have until monday 6pm" },
  ],
};

export const CABIN_SENTENCE_READING: Extraction = {
  ...CABIN_CHAT_READING,
  evidence: [
    { field: "total_cents", quote: "The cabin is $320" },
    { field: "share_cents", quote: "4 people at $80 each" },
    { field: "deadline_at", quote: "Friday 6 November 2026, 6:00pm Pacific" },
    { field: "grace_until", quote: "Monday 9 November 2026, 6:00pm Pacific" },
  ],
};

export const PRINT_READING: Extraction = {
  ...CABIN_CHAT_READING,
  title: "Print run",
  total_cents: 20000,
  share_cents: 5000,
  grace_person_name: null,
  grace_until: null,
  people: ["Priya Nair", "Noah Brooks", "Elena Vaz", "Chris Dalton"],
  evidence: [
    { field: "total_cents", quote: "The print run is $200" },
    { field: "share_cents", quote: "4 people at $50 each" },
    { field: "deadline_at", quote: "Friday 6 November 2026, 6:00pm Pacific" },
  ],
};

export const NO_TIME_READING: Extraction = {
  ...CABIN_CHAT_READING,
  deadline_at: null,
  grace_person_name: null,
  grace_until: null,
  missing: ["deadline_at"],
  clarification_question: "What time on Friday is the deadline?",
  evidence: [
    { field: "total_cents", quote: "4 people at $80 each" },
    { field: "share_cents", quote: "$80 each" },
  ],
};
