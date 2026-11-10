import type { DateTime } from "luxon";
import { EXTRACTION_FIELDS, PLAIN_FIELD_NAME, REQUIRED_FIELDS } from "./extraction";
import type { Extraction, ExtractionField } from "./extraction";
import { textStatesAmount } from "./money";
import { authorizationWindowEnd, isValidZone, resolveLocalTime, toOffsetIso } from "./time";
import {
  MAX_HEADCOUNT,
  MAX_NAME_CHARS,
  MAX_SHARE_CENTS,
  MAX_TITLE_CHARS,
  MIN_HEADCOUNT,
} from "../shared/rules";

export interface ValidationContext {
  ruleText: string;
  referenceAt: Date;
}

export interface ValidatedExtraction {
  extraction: Extraction;
  /** Every required field is set and nothing is missing. Only a complete extraction can be confirmed. */
  complete: boolean;
}

type Missing = Set<ExtractionField>;

/**
 * The server has the final word on what a model returned. It can only clear a field or add it to `missing`, never fill
 * one in, so a model (or text hidden in the chat) can never put a price, time or name into a plan on its own.
 */
export function validateExtraction(raw: Extraction, context: ValidationContext): ValidatedExtraction {
  const out: Extraction = {
    ...raw,
    title: raw.title?.trim() || null,
    people: raw.people.map((name) => name.trim()).filter((name) => name !== ""),
    evidence: raw.evidence.filter(
      (item) =>
        item.quote !== "" &&
        context.ruleText.includes(item.quote) &&
        (EXTRACTION_FIELDS as readonly string[]).includes(item.field),
    ),
  };
  const missing: Missing = new Set(EXTRACTION_FIELDS.filter((field) => raw.missing.includes(field)));

  checkTitle(out, missing);
  checkHeadcountAndPeople(out, missing, context.ruleText);
  checkMoney(out, missing);
  const times = checkTimes(out, missing, context.referenceAt);
  checkGrace(out, missing, times);

  for (const field of REQUIRED_FIELDS) {
    if (isUnset(out, field)) missing.add(field);
  }
  const ordered = EXTRACTION_FIELDS.filter((field) => missing.has(field));
  out.missing = ordered;
  out.clarification_question = ordered.length === 0 ? null : questionFor(out.clarification_question, ordered);
  return { extraction: out, complete: ordered.length === 0 };
}

function isUnset(extraction: Extraction, field: ExtractionField): boolean {
  const value = extraction[field];
  return Array.isArray(value) ? value.length === 0 : value === null;
}

function questionFor(asked: string | null, missing: ExtractionField[]): string {
  if (asked !== null && asked.trim() !== "") return asked;
  return `Add the missing pieces: ${missing.map((field) => PLAIN_FIELD_NAME[field]).join(", ")}.`;
}

function clear(out: Extraction, missing: Missing, ...fields: Exclude<ExtractionField, "people">[]): void {
  for (const field of fields) {
    out[field] = null;
    missing.add(field);
  }
}

/** Control characters and our own prompt tags, which a pasted chat could plant in the title the assistant later reads. */
const UNSAFE_IN_TITLE = /[\u0000-\u001f\u007f]|<\/?(?:group_text|tool_result|organizer_answer)[^>]*>/gi;

/** The limits the database enforces, so a stored plan can never be refused later at confirm. */
function checkTitle(out: Extraction, missing: Missing): void {
  if (out.title !== null) out.title = out.title.replace(UNSAFE_IN_TITLE, "").trim() || null;
  if (out.title !== null && out.title.length > MAX_TITLE_CHARS) clear(out, missing, "title");
}

/** Each word of a name appears somewhere in the pasted text (any case). A name the model made up never does. */
function inText(name: string, text: string): boolean {
  const haystack = text.toLowerCase();
  return name
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

function checkHeadcountAndPeople(out: Extraction, missing: Missing, ruleText: string): void {
  if (out.headcount !== null && (out.headcount < MIN_HEADCOUNT || out.headcount > MAX_HEADCOUNT)) {
    clear(out, missing, "headcount");
  }
  const names = new Set(out.people.map((name) => name.toLowerCase()));
  const duplicated = names.size !== out.people.length;
  const tooLong = out.people.some((name) => name.length > MAX_NAME_CHARS);
  const invented = out.people.some((name) => !inText(name, ruleText));
  const wrongCount = out.headcount !== null && out.people.length !== out.headcount;
  if (duplicated || tooLong || invented || wrongCount) {
    missing.add("people");
  }
}

/** A price is kept when the quoted text states it, or when it follows exactly from the other price the text states. */
function checkMoney(out: Extraction, missing: Missing): void {
  if (out.share_cents !== null && out.share_cents > MAX_SHARE_CENTS) {
    clear(out, missing, "share_cents", "total_cents");
  }
  const quotes = out.evidence.map((item) => item.quote);
  const totalStated = statesAmount(quotes, out.total_cents);
  const shareStated = statesAmount(quotes, out.share_cents);
  const even = isEvenSplit(out.total_cents, out.share_cents, out.headcount);

  if (!keepPrice(out.total_cents, totalStated, shareStated, even)) clear(out, missing, "total_cents");
  if (!keepPrice(out.share_cents, shareStated, totalStated, even)) clear(out, missing, "share_cents");
  if (!isEvenSplit(out.total_cents, out.share_cents, out.headcount) && bothPricesSet(out)) {
    clear(out, missing, "total_cents", "share_cents");
  }
}

function statesAmount(quotes: string[], cents: number | null): boolean {
  return cents !== null && cents > 0 && quotes.some((quote) => textStatesAmount(quote, cents));
}

function keepPrice(value: number | null, stated: boolean, otherStated: boolean, even: boolean): boolean {
  return value === null || stated || (otherStated && even);
}

function isEvenSplit(total: number | null, share: number | null, headcount: number | null): boolean {
  return total !== null && share !== null && headcount !== null && total === headcount * share;
}

/** Both prices and the headcount are set, which is when the two prices must agree. */
function bothPricesSet(out: Extraction): boolean {
  return out.total_cents !== null && out.share_cents !== null && out.headcount !== null;
}

interface ResolvedTimes {
  deadline: DateTime<true> | null;
  grace: DateTime<true> | null;
  windowEnd: DateTime<true>;
}

/** Re-emits every time with the offset luxon computes, so the server decides daylight time and the model does not. */
function checkTimes(out: Extraction, missing: Missing, referenceAt: Date): ResolvedTimes {
  const windowEnd = authorizationWindowEnd(referenceAt);
  const zone = out.timezone;
  if (zone === null || !isValidZone(zone)) {
    clear(out, missing, "timezone", "deadline_at", "grace_until");
    return { deadline: null, grace: null, windowEnd };
  }
  const reference = referenceAt.getTime();
  const parsed = out.deadline_at === null ? null : resolveLocalTime(out.deadline_at, zone);
  const inWindow = parsed !== null && parsed.toMillis() > reference && parsed <= windowEnd;
  const deadline = inWindow && weekdayAgrees(quoteFor(out, "deadline_at"), parsed) ? parsed : null;
  const graceParsed = out.grace_until === null ? null : resolveLocalTime(out.grace_until, zone);
  const grace =
    graceParsed !== null && weekdayAgrees(quoteFor(out, "grace_until"), graceParsed) ? graceParsed : null;
  settle(out, missing, "deadline_at", deadline);
  settle(out, missing, "grace_until", grace);
  return { deadline, grace, windowEnd };
}

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const WEEKDAY_WORD = new RegExp(`\\b(${WEEKDAYS.join("|")})\\b`, "gi");

function quoteFor(out: Extraction, field: ExtractionField): string | undefined {
  return out.evidence.find((item) => item.field === field)?.quote;
}

/**
 * When the quote a time came from names one weekday ("Friday 6pm"), the resolved date must fall on it. A model that
 * picks the wrong Friday is caught here; abbreviations are not checked, so "each friend" never reads as Friday.
 */
function weekdayAgrees(quote: string | undefined, at: DateTime<true>): boolean {
  const named = new Set((quote?.match(WEEKDAY_WORD) ?? []).map((word) => word.toLowerCase()));
  if (named.size !== 1) return true;
  return named.has(WEEKDAYS[at.weekday - 1] ?? "");
}

/** A time that resolved is stored with its computed offset. One that did not is cleared. */
function settle(
  out: Extraction,
  missing: Missing,
  field: "deadline_at" | "grace_until",
  resolved: DateTime<true> | null,
): void {
  if (out[field] === null) return;
  if (resolved === null) clear(out, missing, field);
  else out[field] = toOffsetIso(resolved);
}

/** At most one named person may pay later than the deadline, and only until a time after it. */
function checkGrace(out: Extraction, missing: Missing, times: ResolvedTimes): void {
  const name = out.grace_person_name?.trim() ?? "";
  if (name !== "" && out.grace_until === null) missing.add("grace_until");
  if (name === "" && out.grace_until !== null) missing.add("grace_person_name");
  if (name !== "") {
    // The share row stores the name exactly as written in `people`, so the grace name takes that spelling.
    const listed = out.people.find((person) => person.toLowerCase() === name.toLowerCase());
    if (listed === undefined) missing.add("grace_person_name");
    else out.grace_person_name = listed;
  }
  if (graceOutOfRange(times)) missing.add("grace_until");
}

function graceOutOfRange({ deadline, grace, windowEnd }: ResolvedTimes): boolean {
  if (grace === null) return false;
  return grace > windowEnd || (deadline !== null && grace <= deadline);
}
