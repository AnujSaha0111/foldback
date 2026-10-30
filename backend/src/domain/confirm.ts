import { DateTime } from "luxon";
import type { Extraction } from "./extraction";

/** The terms of a plan, exactly as the Rule screen shows them and as confirm echoes them back. */
export interface Terms {
  title: string;
  currency: string;
  total_cents: number;
  share_cents: number;
  headcount: number;
  deadline_at: string;
  timezone: string;
  grace_person_name: string | null;
  grace_until: string | null;
  people: string[];
}

/** The terms of a stored reading, or null when anything required is missing. A confirmed plan is never partial. */
export function termsOf(reading: Extraction): Terms | null {
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

/** Field by field, with no tolerance. There is no editor on the confirm step, so any difference is a tampered request. */
export function sameTerms(stored: Terms, echoed: Terms): boolean {
  const key = (t: Terms): string =>
    JSON.stringify([
      t.title,
      t.currency,
      t.total_cents,
      t.share_cents,
      t.headcount,
      t.deadline_at,
      t.timezone,
      t.grace_person_name,
      t.grace_until,
      t.people,
    ]);
  return key(stored) === key(echoed);
}

/** The demo clock starts two hours before the deadline, so the demo opens just before the moment that matters. */
export function demoClockStart(deadlineAt: string): string {
  const start = DateTime.fromISO(deadlineAt, { setZone: true }).minus({ hours: 2 });
  if (!start.isValid) throw new Error("The deadline is not a valid time.");
  return start.toISO({ suppressMilliseconds: true });
}
