const DAY_MS = 86_400_000;

/** Midnight at the start of the day `ms` falls on, in the plan's own time zone, as a UTC timestamp. */
export function dayStart(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // How far the zone is from UTC at this moment, then step back to its midnight.
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const offset = asUtc - Math.floor(ms / 1000) * 1000;
  return Date.UTC(get("year"), get("month") - 1, get("day")) - offset;
}

interface Day {
  label: string;
  isToday: boolean;
}

export interface Timeline {
  days: Day[];
  /** Where a moment sits across the board, 0 at the left edge and 1 at the right, clamped. */
  at: (iso: string) => number;
}

interface Moments {
  timeZone: string;
  now: string;
  deadline: string;
  graceUntil: string | null;
}

/** From two days before now to two days after the last thing that can happen (the deadline or the grace end). */
export function buildTimeline({ timeZone, now, deadline, graceUntil }: Moments): Timeline {
  const nowMs = new Date(now).getTime();
  const last = Math.max(new Date(deadline).getTime(), graceUntil ? new Date(graceUntil).getTime() : 0, nowMs);
  const start = dayStart(nowMs, timeZone) - 2 * DAY_MS;
  const count = Math.round((dayStart(last, timeZone) - start) / DAY_MS) + 2;
  const label = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", day: "numeric" });
  const today = dayStart(nowMs, timeZone);
  const days = Array.from({ length: count }, (_, index) => {
    // Noon of each day, so a daylight-saving change never lands the label on the wrong date.
    const noon = start + index * DAY_MS + DAY_MS / 2;
    const parts = label.formatToParts(noon);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
    return { label: `${part("weekday")} ${part("day")}`, isToday: dayStart(noon, timeZone) === today };
  });
  const span = count * DAY_MS;
  return { days, at: (iso) => Math.min(1, Math.max(0, (new Date(iso).getTime() - start) / span)) };
}
