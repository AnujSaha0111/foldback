import { z } from "zod";
import type { ApiExtraction } from "../shared/api-types";

/** What the model returns, and what is stored in contracts.extraction. Every value is checked again by validateExtraction. */
export const ExtractionSchema = z.object({
  title: z.string().nullable(),
  currency: z.enum(["USD"]).nullable(),
  total_cents: z.number().int().nullable(),
  share_cents: z.number().int().nullable(),
  headcount: z.number().int().nullable(),
  deadline_at: z.string().nullable(),
  timezone: z.string().nullable(),
  grace_person_name: z.string().nullable(),
  grace_until: z.string().nullable(),
  people: z.array(z.string()),
  missing: z.array(z.string()),
  clarification_question: z.string().nullable(),
  evidence: z.array(z.object({ field: z.string(), quote: z.string() })),
}) satisfies z.ZodType<ApiExtraction>;

export type Extraction = z.infer<typeof ExtractionSchema>;

/** A plan cannot be confirmed until all of these are set. */
export const REQUIRED_FIELDS = [
  "title",
  "currency",
  "total_cents",
  "share_cents",
  "headcount",
  "deadline_at",
  "timezone",
  "people",
] as const;

export const EXTRACTION_FIELDS = [...REQUIRED_FIELDS, "grace_person_name", "grace_until"] as const;
export type ExtractionField = (typeof EXTRACTION_FIELDS)[number];

/** Words for the clarification question, so the organizer never sees a column name. */
export const PLAIN_FIELD_NAME: Record<ExtractionField, string> = {
  title: "what the plan is for",
  currency: "the currency",
  total_cents: "the total price",
  share_cents: "each person's share",
  headcount: "how many people",
  deadline_at: "the deadline time",
  timezone: "the time zone",
  people: "the people's names",
  grace_person_name: "who gets extra time",
  grace_until: "the extra time",
};
