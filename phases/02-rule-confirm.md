# Phase 2 — Rule confirm

Budget: 5 hours. Owner: Rules owner. Depends on phase 1. May run beside phase 3.

## Read

- `ai.md`
- `api.md` sections Create from a rule and Confirm
- `ui.md` Rule screen
- `demo.md` rule pastes
- `test.md` cases marked phase 2

## Goal

A pasted rule becomes either a clarification question or a confirmed contract with `waiting` sandbox shares. Tests never hit the network.

## Do not

- Do not let the confirm request change cents, headcount, or the deadline away from `extraction_json`.
- Do not create shares before confirm.
- Do not call resolve, checkout, or PayPal.
- Do not add a field editor.

## Create

```text
app/server/src/engine/extract.ts
app/server/src/engine/confirm.ts
app/server/src/llm/client.ts
app/server/test/fixtures/rules.ts
app/server/test/extract.test.ts
app/client/src/screens/RuleScreen.tsx
```

`llm/client.ts` is the only `fetch` to `LLM_BASE_URL`. `extract.ts` validates and applies the overwrite rules in `ai.md`. Tests inject a stub client. The default client is used only when `LLM_API_KEY` is set; if it is missing, `POST /api/contracts` returns 500 `internal` with message `LLM_API_KEY is not set`. Do not silently skip extraction.

`app/server/test/fixtures/rules.ts` exports the cabin and print pastes (re-export from `app/shared/src/rules.ts`) and the four broken inputs from `ai.md`, plus the stub JSON each test expects.

Confirm sets `money_source` to `sandbox` and status `waiting` for each named person. `demo_now` is two hours before `deadline_at`. Status becomes `active`. Navigate the client to `/board/:id` even if the board is still the phase 0 spike. Phase 3 replaces the board body.

Rule screen behavior matches `ui.md`, including the existing-contract list from `GET /api/contracts`.

## Exit check

Phase 2 tests in `test.md` pass, including:

- Cabin paste stub confirms with grace person Maya Shah and four shares at 8000 cents.
- `no-date`, `bad-math`, `two-grace`, and `headcount-6` return 422 and do not insert shares.
- Confirm with a tampered `share_cents` returns `422 confirm_mismatch` and leaves status `awaiting_confirmation`.
- Evidence quotes that are not substrings are dropped.

Manual, if a key is available: paste the cabin rule, read the question-free field list, confirm, and see four shares in `GET /api/contracts/:id`. If no key is available, the stub tests are enough to exit this phase. Say so in the exit note.

## Exit note

Stub tests:

Manual paste:
