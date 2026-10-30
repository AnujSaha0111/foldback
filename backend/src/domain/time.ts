import { DateTime, IANAZone } from "luxon";
import { AUTHORIZATION_WINDOW_DAYS } from "../shared/rules";

export function isValidZone(zone: string): boolean {
  return IANAZone.isValidZone(zone);
}

/** The reference time as the model sees it, for example "Sunday 1 November 2026, 12:00 PM PST". */
export function describeInstant(instant: Date, zone: string): string {
  return DateTime.fromJSDate(instant, { zone }).setLocale("en-US").toFormat("EEEE d MMMM yyyy, h:mm a ZZZZ");
}

/** An instant as ISO text with the zone's offset, for example "2026-11-01T12:00:00-08:00". */
export function isoInZone(instant: Date, zone: string): string {
  return (
    DateTime.fromJSDate(instant, { zone }).toISO({ suppressMilliseconds: true }) ?? instant.toISOString()
  );
}

/**
 * Takes the wall-clock date and time the model wrote, ignores any offset it added, and reads them in the organizer's
 * zone. The server, not the model, decides whether daylight time applies. Null when the text is not a date and time,
 * or when that wall-clock time does not exist in the zone (the hour skipped when clocks go forward).
 */
export function resolveLocalTime(text: string, zone: string): DateTime<true> | null {
  const written = DateTime.fromISO(text, { setZone: true });
  if (!written.isValid || !/T\d{2}:\d{2}/.test(text)) return null;
  const { year, month, day, hour, minute, second } = written;
  const resolved = DateTime.fromObject({ year, month, day, hour, minute, second }, { zone });
  if (!resolved.isValid || resolved.hour !== hour || resolved.minute !== minute) return null;
  return resolved;
}

/** "2026-11-06T18:00:00-08:00". Used to store and show times in one format. */
export function toOffsetIso(time: DateTime<true>): string {
  return time.toISO({ suppressMilliseconds: true });
}

/** The last moment a deadline or grace time may fall: the PayPal authorization lifetime after the paste. */
export function authorizationWindowEnd(referenceAt: Date): DateTime<true> {
  const end = DateTime.fromJSDate(referenceAt).plus({ days: AUTHORIZATION_WINDOW_DAYS });
  if (!end.isValid) throw new Error("The reference time is not a valid date.");
  return end;
}
