import type { ApiExtraction, RuleClarification, RuleResult } from "@/types/generated/api-types";

/** Where the Rule screen stands. The API decides which one it is, the screen only shows it. */
export type Reading =
  | { kind: "none" }
  | { kind: "question"; contractId: string; question: string }
  | { kind: "ready"; contractId: string; extraction: ApiExtraction };

const isClarification = (data: unknown): data is RuleClarification =>
  typeof data === "object" &&
  data !== null &&
  "contract_id" in data &&
  typeof data.contract_id === "string" &&
  "message" in data &&
  typeof data.message === "string";

/** True for the 422 that carries a question. It is a normal step, so it is never shown as an error. */
export function isQuestion(error: unknown): boolean {
  return typeof error === "object" && error !== null && "data" in error && isClarification(error.data);
}

type Outcome = { data: RuleResult } | { error: unknown };

/** The next state after a read or a clarify. A real failure leaves the screen where it was. */
export function nextReading(outcome: Outcome, current: Reading): Reading {
  if ("data" in outcome) {
    return { kind: "ready", contractId: outcome.data.contract_id, extraction: outcome.data.extraction };
  }
  const { error } = outcome;
  if (typeof error === "object" && error !== null && "data" in error && isClarification(error.data)) {
    return { kind: "question", contractId: error.data.contract_id, question: error.data.message };
  }
  return current;
}

/** The line of the chat a value was read from, if the model gave one. */
export function quoteFor(reading: ApiExtraction, field: string): string | null {
  return reading.evidence.find((item) => item.field === field)?.quote ?? null;
}

/** A run of the pasted text, marked with the field it was read for when it is one of the model's quotes. */
export interface Segment {
  text: string;
  field: string | null;
}

/**
 * Splits the pasted text into plain runs and quoted runs, so the screen can show where each value came from. Quotes
 * are matched without regard to case; one that is not found, or that overlaps an earlier one, is left unmarked.
 */
export function markQuotes(text: string, evidence: ApiExtraction["evidence"]): Segment[] {
  const lower = text.toLowerCase();
  const spans = evidence
    .map((item) => ({
      field: item.field,
      start: lower.indexOf(item.quote.toLowerCase()),
      length: item.quote.length,
    }))
    .filter((span) => span.start >= 0 && span.length > 0)
    .sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let at = 0;
  for (const span of spans) {
    if (span.start < at) continue;
    if (span.start > at) segments.push({ text: text.slice(at, span.start), field: null });
    segments.push({ text: text.slice(span.start, span.start + span.length), field: span.field });
    at = span.start + span.length;
  }
  if (at < text.length) segments.push({ text: text.slice(at), field: null });
  return segments;
}

/** The marked text split into lines, so each chat message can be laid out on its own. Empty lines are kept. */
export function toLines(segments: Segment[]): Segment[][] {
  const lines: Segment[][] = [[]];
  for (const segment of segments) {
    segment.text.split("\n").forEach((piece, index) => {
      if (index > 0) lines.push([]);
      if (piece) lines[lines.length - 1]?.push({ text: piece, field: segment.field });
    });
  }
  return lines;
}

/** "[Sun 1 Nov, 11:42] Alex Chen: hi" becomes its time, its speaker and the rest. Null when it is not a chat line. */
export function chatPrefix(text: string): { time: string; speaker: string; rest: string } | null {
  const match = /^\[([^\]]{1,40})\]\s*([^:\n]{1,40}):\s?/.exec(text);
  if (!match) return null;
  return { time: match[1] ?? "", speaker: match[2] ?? "", rest: text.slice(match[0].length) };
}
