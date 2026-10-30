import type { ApiExtraction, ConfirmTerms } from "./api-types";

/**
 * The terms of a reading, or null when anything required is missing. A confirmed plan is never partial. The Rule
 * screen uses this to decide what to offer, and the server uses it again to decide what to accept.
 */
export function termsOf(reading: ApiExtraction): ConfirmTerms | null {
  const { title, currency, total_cents, share_cents, headcount, deadline_at, timezone } = reading;
  if (
    title === null ||
    currency === null ||
    total_cents === null ||
    share_cents === null ||
    headcount === null ||
    deadline_at === null ||
    timezone === null ||
    reading.missing.length > 0
  ) {
    return null;
  }
  return {
    title,
    currency,
    total_cents,
    share_cents,
    headcount,
    deadline_at,
    timezone,
    grace_person_name: reading.grace_person_name,
    grace_until: reading.grace_until,
    people: reading.people,
  };
}
