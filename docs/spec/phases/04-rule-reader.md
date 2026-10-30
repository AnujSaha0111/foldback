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

- [ ] Phase 4 cases and L1–L7 and L9 pass. CI is green, and the change is deployed.
- [ ] Manual on production: paste the cabin chat, see the field list with quotes, confirm, and see four shares. Paste the `no-time` text, answer it, and see it complete. `ai_usage` shows the attempt and its token counts.
- [ ] `learn/06-rule-reader.md` is written.

## Exit note

Live latency and cost per extraction:
