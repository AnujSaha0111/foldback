import { z } from "zod";
import { MAX_CLARIFY_ANSWER_CHARS, MAX_HEADCOUNT, MAX_RULE_TEXT_CHARS } from "../shared/rules";

export const createRuleSchema = z.strictObject({
  rule_text: z.string().trim().min(1).max(MAX_RULE_TEXT_CHARS),
  use_fixture_time: z.boolean().optional(),
});

export const clarifySchema = z.strictObject({
  answer: z.string().trim().min(1).max(MAX_CLARIFY_ANSWER_CHARS),
});

/** The terms echoed back at confirm. Every field is required, and the service compares each with the stored reading. */
export const confirmSchema = z.strictObject({
  title: z.string(),
  currency: z.string(),
  total_cents: z.number().int(),
  share_cents: z.number().int(),
  headcount: z.number().int(),
  deadline_at: z.string(),
  timezone: z.string(),
  grace_person_name: z.string().nullable(),
  grace_until: z.string().nullable(),
  people: z.array(z.string()).max(MAX_HEADCOUNT),
});

export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type ClarifyInput = z.infer<typeof clarifySchema>;
export type ConfirmInput = z.infer<typeof confirmSchema>;
