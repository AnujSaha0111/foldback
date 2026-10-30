# Phase 4 — Rule reader

Budget: 6 hours. Hat: Rules. Depends on phase 3. Dates: 2–3 November 2026.

## Read

- `ai.md`: Provider, Job 1, Cost and abuse limits, Fixtures
- `api.md`: Create from a rule, Clarify, Confirm
- `demo.md`: the strings
- `test.md`: phase 4 and limits cases

## Goal

A pasted chat becomes either one clarifying question, which the organizer can answer, or a confirmed contract with `waiting` sandbox shares. Every LLM call goes through the AI guard. Tests never hit the network.

## Create

```text
backend/src/integrations/llm/{client,extractPrompt}.ts
backend/src/domain/{extraction,validateExtraction,money,time}.ts   pure, unit-tested (extraction.ts holds the zod schema)
backend/src/services/{extract,confirm,aiBudget}.service.ts   (extract also reads clarify answers)
backend/src/repositories/aiUsage.repo.ts
backend/src/controllers/rules.controller.ts                 (create, clarify, confirm)
backend/test/unit/validateExtraction.test.ts
backend/test/integration/{extract,limits}.test.ts
backend/test/fixtures/{rules,llm}.ts
```

Extend `contracts.routes.ts` with `POST /api/contracts`, `/:id/clarify`, and `/:id/confirm`.

## Do not

- Let confirm change any value from `extraction`.
- Create shares before confirm.
- Use an OpenRouter model that is not free.

## Exit check

- [x] Phase 4 cases and L1–L7 and L9 pass (plus L10). CI is green, and the change is deployed.
- [x] Manual on production (30 Oct 2026, commit f535741, via the API, since the frontend is not built yet): paste the cabin chat, see the field list with quotes, confirm, and see four shares. Paste the `no-time` text, answer it, and see it complete. `ai_usage` shows the attempt and its token counts.
- [x] `learn/06-rule-reader.md` is written.

## Exit note

Live latency and cost per extraction (measured with `yarn bakeoff` on the real free models, 30 Oct 2026): `groq:openai/gpt-oss-120b` averages 1.9 s and about 1,650 tokens per extraction and passed 19 of 20 fixtures over two runs; the two Gemini lite models average 1.8 s and 3.3 s and passed 10 of 10. Cost is zero, because every model is on a free tier. `deepseek:deepseek-flash` (a $2 prepaid balance, the team's decision) scored 20 of 20 over two runs at 1.8 s and about 1,340 tokens, so the chain is DeepSeek first, then Groq, then the two Gemini lite models (see `ai.md`, Bake-off results). At those token counts and DeepSeek's peak prices, $2 buys about 2,800 extractions. The bake-off also fixed three bugs that fake models could not show: Groq refusing the reply schema, "Monday" resolving before the deadline, and the prompt ignoring the organizer's answer. Manual production check, 30 Oct 2026, on commit f535741 with the DeepSeek, Groq and Gemini keys on the Mac: the cabin chat was read in one call (title, 32000 / 8000 / 4, deadline `2026-11-06T18:00:00-08:00`, Maya Shah until `2026-11-09T18:00:00-08:00`, no field missing), confirm returned status `active` with four `waiting` sandbox shares at 8000 and `demo_now` two hours before the deadline, the history showed `rule_extracted` and `rule_confirmed`, and `ai_calls_left` went from 600 to 599. A second confirm with changed amounts returned 409 `contract_closed`, a request from a foreign origin returned 403, and the no-time text asked "What time on Friday evening is the deadline?" and was completed by the answer "6pm Pacific".
