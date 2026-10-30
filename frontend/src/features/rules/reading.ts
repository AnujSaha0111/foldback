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
