// The plain-language rule behind each sample plan. Shown on the board and used for the seeds.

export const CABIN_RULE_TEXT =
  "The cabin is $320. We need 4 people at $80 each by Friday 6 November 2026, 6:00pm Pacific. " +
  "The people are Alex Chen, Sam Ortiz, Jordan Lee, and Maya Shah. " +
  "If Maya Shah is waiting on payday, give her until Monday 9 November 2026, 6:00pm Pacific. " +
  "If we are still short, nobody pays.";

export const PRINT_RULE_TEXT =
  "The print run is $200. We need 4 people at $50 each by Friday 6 November 2026, 6:00pm Pacific. " +
  "The people are Priya Nair, Noah Brooks, Elena Vaz, and Chris Dalton. " +
  "If we are still short, nobody pays.";

/** How many people can share a plan. The database CHECK allows the same range. */
export const MIN_HEADCOUNT = 2;
export const MAX_HEADCOUNT = 4;

/** A PayPal authorization lives 29 days, so no deadline or grace time may be further away than that. */
export const AUTHORIZATION_WINDOW_DAYS = 29;

export const DEFAULT_TIMEZONE = "America/Los_Angeles";
