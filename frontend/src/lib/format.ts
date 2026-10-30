const MONEY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 8000 becomes "$80.00". Amounts are whole cents everywhere, so there is no rounding here. */
export function formatMoney(cents: number): string {
  return MONEY.format(cents / 100);
}

/**
 * A moment in the plan's own time zone, the way the screens write it: "Fri 6 Nov 2026, 6:00pm PST", or the shorter
 * "Fri 6 Nov, 6:00pm PT" that the board uses.
 */
export function formatMoment(iso: string, timeZone: string, short = false): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: short ? "shortGeneric" : "short",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? "";
  const date = `${get("weekday")} ${get("day")} ${get("month")}${short ? "" : ` ${get("year")}`}`;
  return `${date}, ${get("hour")}:${get("minute")}${get("dayPeriod").toLowerCase()} ${get("timeZoneName")}`;
}
