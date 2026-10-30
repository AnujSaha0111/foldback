import { DateTime } from "luxon";
import type { ConfirmTerms } from "../shared/api-types";

/** The terms of a plan, exactly as the Rule screen shows them and as confirm echoes them back. */
export type Terms = ConfirmTerms;

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
