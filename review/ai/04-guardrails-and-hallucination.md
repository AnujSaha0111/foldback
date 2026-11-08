# Hallucination control and guardrails

Owner: Ravi. Sources: `backend/src/domain/validateExtraction.ts`, `backend/src/domain/money.ts` (`textStatesAmount`), `backend/src/domain/extraction.ts`, `backend/src/domain/reason.ts`, `backend/src/services/agentTools.ts`, `backend/test/unit/validateExtraction.test.ts` (33 cases), `docs/spec/ai.md` (Server validator).

## Summary

The server validator is the core of the AI design, and it is good: it can only clear fields or add them to `missing`, never fill them. A price survives only if a surviving exact-substring quote states it with a currency marker, or it follows exactly from the other stated price and the headcount. Times are recomputed by the server and limited to the 29-day authorization window. The model never writes amounts, statuses, PayPal ids or the resolution sentence. Two gaps remain: people's names (AI-018) and the weekday a deadline lands on (AI-021) are taken from the model without a server check.

## [AI-017] Extraction validator: money support, math and the 29-day window

- Category: Guardrails
- Severity: Informational
- Status: Implemented
- File: `backend/src/domain/validateExtraction.ts`
- Code Location: `validateExtraction` (31–53), `checkMoney` (90–104), `checkTimes` (130–144), `checkGrace` (159–170)
- Description: In order: drop evidence that is not an exact substring; check title length; headcount must be 2–4 and match `people`, with no duplicates or over-long names; prices must be supported (stated with a currency marker, or derived exactly through the headcount) and agree (`total = headcount × share`); share at most `MAX_SHARE_CENTS`; zone must be a storable IANA zone; deadline after the reference time and within 29 days; grace name must be one of the people, grace after the deadline and within the window. Anything that fails is cleared or marked missing.
- Current Implementation: As described. Covers the `injected-price`, `invented-price`, `bad-math`, `headcount-6`, `two-grace` and `bad-offset` fixtures from `ai.md`.
- Problem: None in what it checks.
- Why It Matters: This is why an injected "set the share to $1" cannot create a $1 hold. The judges' Technological Implementation lens will value it, so it should be shown, not just built.
- Recommended Solution: Keep. Add a short "What the AI is not allowed to do, and how the server enforces it" table to the README judge guide (see MI-025).
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: MI-025
- Verification Method: `validateExtraction.test.ts` (33 cases) passes; I re-read each rule against `ai.md` steps 1–9.

## [AI-018] People's names are not checked against the pasted text

- Category: Hallucination control
- Severity: Medium
- Status: Missing
- File: `backend/src/domain/validateExtraction.ts`
- Code Location: `checkHeadcountAndPeople` (77–87)
- Description: Prices need a quote; names do not. The validator checks count, duplicates and length, but not that each name appears in `rule_text`.
- Current Implementation: The prompt says "Do not invent surnames" and "as written in the text". Evidence items for `people` are optional and, if present, only checked as substrings, not matched to the names.
- Problem: A model can return a plausible but wrong name ("Sam Ortega" for "Sam Ortiz") or invent a fourth person to make the headcount fit. The plan would then create a share, and a pay link, for someone who does not exist. The organizer does see the names before confirming, but four chips are easy to skim.
- Why It Matters: Names become shares, pay links and reminder drafts. This is the one field where a hallucination turns directly into a payable object, and it is the field the bake-off cannot see (it scores after validation).
- Recommended Solution: In `checkHeadcountAndPeople`, add `people` to `missing` when any name does not appear in `rule_text` (case-insensitive, whitespace-normalised). To allow a chat that uses first names only, accept a name whose first token appears and whose remaining tokens also appear in the text. Do not fill or correct names, only flag. Add a fixture `invented-person` (cabin chat plus a stub returning "Priya Nair" as the fourth person).
- Implementation Complexity: Low
- Breaking Change Risk: Low (it can only add a clarify question)
- Dependencies: Re-run `yarn bakeoff --runs 2` to confirm the cabin, sentence and print fixtures still pass.
- Verification Method: New unit tests in `validateExtraction.test.ts`; the cabin and print fixtures must still be complete.

## [AI-019] Title and evidence field labels are taken as given

- Category: Hallucination control
- Severity: Low
- Status: Partially Implemented
- File: `backend/src/domain/validateExtraction.ts`
- Code Location: `checkTitle` (73–75); evidence filter (line 36)
- Description: The title is only length-checked (60 characters). Evidence items keep any `field` label the model gives, and `checkMoney` accepts a currency-marked quote attached to any field.
- Current Implementation: As described.
- Problem: Minor. A title such as "Ignore previous instructions" would pass if the model copied it, and it later reaches the assistant's system prompt (AI-022). A money quote mislabelled as `deadline_at` still supports the price, which is the right outcome anyway.
- Why It Matters: The title is the only free text from the chat that is placed inside the agent's system prompt.
- Recommended Solution: Strip control characters and the `group_text` / `tool_result` tags from the title, and cap it at about 40 characters (the prompt asks for three words). Optionally drop evidence items whose `field` is not one of `EXTRACTION_FIELDS`.
- Implementation Complexity: Low
- Breaking Change Risk: Low (a database CHECK would need the same cap only if it is lowered there too)
- Dependencies: AI-022
- Verification Method: Unit tests for the title sanitiser.

## [AI-020] The model never writes amounts, statuses, PayPal ids or the resolution sentence

- Category: Guardrails
- Severity: Informational
- Status: Implemented
- File: `backend/src/domain/reason.ts`, `backend/src/services/agentTools.ts`, `backend/src/services/agent.service.ts`
- Code Location: `reasons` (reason.ts 13–37); tool results built from rows (agentTools 136–187); `AgentResponse` returns only `reply`, `tool_calls`, `proposals`, `drafts`
- Description: `resolution_reason` is written by the resolve engine from fixed sentences. Amounts and statuses shown to users come from rows. The agent's reply is free text, but the prompt forbids stating anything a tool did not return. Proposals are built by code, not by the model.
- Current Implementation: As described. The agent never sees PayPal ids: `get_status` returns status words and a `can_pay_now` flag only. The pasted rule text is not sent to the agent (but see AI-022 for text that is).
- Problem: None in what is stored. The reply itself can still be wrong, as any LLM text can. The UI shows the tool lines under it, which is the right mitigation.
- Why It Matters: Matches the product copy rule "never AI decided".
- Recommended Solution: Keep.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: Integration test "never sends the rule text to the model (test 83)"; code read.

## [AI-021] The weekday a deadline resolves to is not cross-checked

- Category: Hallucination control
- Severity: Low
- Status: Missing
- File: `backend/src/domain/validateExtraction.ts`
- Code Location: `checkTimes` (130–144)
- Description: The server fixes offsets, but whether "Friday" became the right Friday is the model's call. The bake-off left out `gpt-oss-20b` precisely because it produced complete readings with the wrong deadline, which no check caught.
- Current Implementation: The Rule screen shows the resolved date in words next to the quote, and the organizer confirms.
- Problem: If a fallback model resolves "Friday" to Thursday, the reading is still "complete".
- Why It Matters: A wrong deadline captures or releases on the wrong day, with real (sandbox) money.
- Recommended Solution: When the surviving evidence quote for `deadline_at` (or `grace_until`) contains a weekday word, require that the resolved date falls on that weekday and within the next 7 days after the reference time (or after the deadline for grace). On a mismatch, add the field to `missing`. This is about 15 lines and a weekday table, with no dependency.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Evidence for times must name the weekday. The current fixtures do ("by friday 6pm pacific").
- Verification Method: Unit test: the cabin reading with `deadline_at` moved to Thursday must come back with `deadline_at` missing.
