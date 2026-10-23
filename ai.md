# Rule extraction

One model call per pasted rule. The call happens in `engine/extract.ts`. No other module imports the model client.

The model fills a schema. It does not decide lock, grace, or refund. Those are `engine/resolve.ts`.

## Provider

`POST {LLM_BASE_URL}/v1/chat/completions` with `Authorization: Bearer {LLM_API_KEY}` and `response_format` set to the JSON schema below. If the chosen provider uses a different JSON-schema switch, adapt the request in `engine/extract.ts` only, and keep the schema and the validator identical.

Temperature `0`. One retry if the body is not JSON. A second failure stores `needs_clarification` with the fixed question: "I could not read a complete rule. Restate the price, headcount, and deadline."

Do not send PayPal secrets, capture ids, or other people's contracts in the prompt. The user message is only `rule_text`.

## System prompt

Use this text verbatim:

```text
You extract a group payment rule for Foldback. Return JSON only, matching the schema.

title is a short name for what the group is paying for, taken from the text, three words or fewer. For a cabin, use Cabin. For a print run, use Print run. If nothing names the purchase, set title null and add title to missing.

Fill a field only when the text states it. If it is implied but not stated, leave it null and add the field name to missing.

currency is USD or null. Money in the text is US dollars. Convert dollar amounts to integer cents.

headcount is 2, 3, or 4. If the text asks for any other count, set headcount null and add headcount to missing.

total_cents must be stated or be exactly headcount times share_cents. If both are stated and they disagree, set both null, add total_cents and share_cents to missing, and ask which amount is correct.

deadline and grace times need a calendar date and a clock time. The demo timezone is America/Los_Angeles. If the text says Pacific and gives a date and time, emit an ISO-8601 timestamp with the offset that zone uses on that date. Friday 6 November 2026 and Monday 9 November 2026 are Pacific Standard Time, offset -08:00, because daylight time ended on 1 November 2026. If the date or time is missing, add deadline_at or grace_until to missing.

At most one grace person. Grace delays only that person. If the text names several people who can pay late, set grace fields null and add grace_person_name to missing.

evidence quotes must be exact substrings of the user text. Do not invent quotes.

Do not suggest a price, a deadline, or a name that is not in the text.
```

## Schema

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "title",
    "currency",
    "total_cents",
    "share_cents",
    "headcount",
    "deadline_at",
    "timezone",
    "grace_person_name",
    "grace_until",
    "people",
    "missing",
    "clarification_question",
    "evidence"
  ],
  "properties": {
    "title": { "type": ["string", "null"] },
    "currency": { "type": ["string", "null"], "enum": ["USD", null] },
    "total_cents": { "type": ["integer", "null"] },
    "share_cents": { "type": ["integer", "null"] },
    "headcount": { "type": ["integer", "null"] },
    "deadline_at": { "type": ["string", "null"] },
    "timezone": { "type": ["string", "null"] },
    "grace_person_name": { "type": ["string", "null"] },
    "grace_until": { "type": ["string", "null"] },
    "people": { "type": "array", "items": { "type": "string" } },
    "missing": { "type": "array", "items": { "type": "string" } },
    "clarification_question": { "type": ["string", "null"] },
    "evidence": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["field", "quote"],
        "properties": {
          "field": { "type": "string" },
          "quote": { "type": "string" }
        }
      }
    }
  }
}
```

## Server validator

After parse, the server overwrites the model's opinion in these cases:

- If `people.length` is not `headcount`, add `people` to `missing`.
- If `total_cents !== headcount * share_cents`, clear both money fields and add them to `missing`.
- If `headcount` is not 2, 3, or 4, add `headcount` to `missing`.
- If `currency` is not `USD`, add `currency` to `missing`.
- If grace name is set and `grace_until` is null, add `grace_until` to `missing`.
- If grace name is set and is not in `people`, add `grace_person_name` to `missing`.
- If any `evidence.quote` is not an exact substring of `rule_text`, drop that evidence item. Do not fail the whole extraction for a bad quote.
- If `missing` is non-empty, force `clarification_question` to a non-empty string. Default: "Add the missing pieces: {comma-separated missing names}."

`people` may be empty in the model output when the text says "4 people" and does not name them. That adds `people` to `missing`. The confirm screen is not allowed to invent names either. The organizer must paste names or restate the rule with names. The cabin demo sentence in `demo.md` includes four names so the happy path does not stop on `people`.

Required for a complete extraction: `title`, `currency`, `total_cents`, `share_cents`, `headcount`, `deadline_at`, `timezone`, `people` with the right length, and grace fields both set or both null.

## Confirmation

The Rule screen lists each field, the evidence quote, and a confirm button. Confirm posts the extraction unchanged, plus the people list. There is no per-field editor. If a field is wrong, the organizer pastes a corrected rule into a new contract.

Copy on the button: "Confirm these terms. Foldback will keep every share if this headcount is met by the deadline, and refund every captured share if it is not."

## Prompt fixture

Phase 2 tests stub the model. They do not call the network. Fixtures live in `app/server/test/fixtures/rules.ts` and cover:

| Id | Input gist | Expected |
|---|---|---|
| `cabin` | The demo sentence in `demo.md` with four names | Complete, grace Maya Shah |
| `print` | $200, 4 people named, Friday 6pm Pacific, no grace | Complete, grace null |
| `no-date` | "Need 4 people at $80 by Friday evening" | `deadline_at` missing |
| `bad-math` | "$320 total, 4 people at $50" | money fields missing |
| `two-grace` | "Maya or Noah can pay Monday" | `grace_person_name` missing |
| `headcount-6` | "Need 6 people" | `headcount` missing |

The cabin fixture's full string is in `demo.md` under "Rule paste." Tests import it from one shared fixture so the words do not drift.

## What the model must not do

- Choose a price that "seems right"
- Decide that the contract should lock or refund
- Write `resolution_reason` (the engine writes that sentence from counts and timestamps)
- See sandbox payer emails and merge them into people names
- Be called from the capture, refund, clock, or scheduler routes
