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
- [ ] Manual on production: paste the cabin chat, see the field list with quotes, confirm, and see four shares. Paste the `no-time` text, answer it, and see it complete. `ai_usage` shows the attempt and its token counts.
- [x] `learn/06-rule-reader.md` is written.

## Exit note

Live latency and cost per extraction (measured with `yarn bakeoff` on the real free models, 30 Oct 2026): `groq:openai/gpt-oss-120b` averages 1.9 s and about 1,650 tokens per extraction and passed 19 of 20 fixtures over two runs; the two Gemini lite models average 1.8 s and 3.3 s and passed 10 of 10. Cost is zero, because every model is on a free tier. The chain is Groq first, then the two Gemini lite models (see `ai.md`, Bake-off results). The bake-off also fixed three bugs that fake models could not show: Groq refusing the reply schema, "Monday" resolving before the deadline, and the prompt ignoring the organizer's answer. The manual production check (paste the cabin chat, confirm, see four shares) waits for the Gemini and Groq keys on the Mac mini (see the unchecked box above).
