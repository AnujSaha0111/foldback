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

/** The group chat from docs/spec/demo.md: the primary demo input and the "Use the sample cabin chat" text. */
export const CABIN_CHAT_TEXT = [
  "[Sun 1 Nov, 11:42] Alex Chen: ok the cabin is $320 for the weekend, owner wants the money by friday",
  "[Sun 1 Nov, 11:43] Sam Ortiz: so $80 each if it's the four of us",
  "[Sun 1 Nov, 11:43] Jordan Lee: I'm in",
  "[Sun 1 Nov, 11:45] Maya Shah: I'm in but I don't get paid until monday",
  "[Sun 1 Nov, 11:46] Alex Chen: Maya you can have until monday 6pm. everyone else by friday 6pm pacific. if we don't have all 4 the trip is off and nobody pays",
  "[Sun 1 Nov, 11:47] Sam Ortiz: works for me",
].join("\n");

/** The moment the demo texts above were "pasted", so their weekday words resolve to the dates in the video. */
export const FIXTURE_REFERENCE_AT = "2026-11-01T12:00:00-08:00";
export const FIXTURE_TEXTS: readonly string[] = [CABIN_CHAT_TEXT, CABIN_RULE_TEXT, PRINT_RULE_TEXT];

/** Input limits (docs/spec/ai.md) and the ceilings the database enforces. */
export const MAX_RULE_TEXT_CHARS = 6000;
export const MAX_CLARIFY_ANSWER_CHARS = 500;
export const MAX_CLARIFY_ROUNDS = 3;
export const MAX_SHARE_CENTS = 1_000_000;
export const MAX_TITLE_CHARS = 60;
export const MAX_NAME_CHARS = 80;

/** One member may own this many plans of their own, a guest fewer (a judge needs one or two) (architecture.md). */
export const MAX_CONTRACTS_PER_USER = 30;
export const MAX_PLANS_PER_GUEST = 5;
/** Confirmed plans across the whole demo. Drafts do not count: they hold no money and are swept after a day. */
export const MAX_DEMO_CONTRACTS = 1000;
/** New guests per day across the demo, so a per-IP limit loose enough for a shared office stays bounded. */
export const MAX_GUESTS_PER_DAY = 500;

export const CLARIFY_FALLBACK_QUESTION =
  "I could not read a complete rule. Restate the price, the people, and the deadline.";
export const CLARIFY_LIMIT_MESSAGE = "Start a new rule with all the details in one message.";

/** Said on the pay page and in the API's refusal while a share's PayPal result is unknown. */
export const UNCLEAR_RESULT =
  "PayPal did not return a clear result. Your share stays reserved while we check.";

/** Said before a reset in the dialog and after it in the API response. */
export const RESET_HOLDS_WARNING =
  "Sandbox holds that already exist in PayPal stay there until they are voided or expire.";
