# AI architecture and model selection

Owner: Ravi. Reviewed on `main` at `196f4f9` (8 November 2026). Sources: `backend/src/integrations/llm/client.ts`, `backend/src/config/env.ts`, `docs/spec/ai.md`, `backend/test/unit/llmClient.test.ts`, and two live assistant turns on https://app.foldback.tech.

## Summary

The model layer is small, deliberate and well tested. One file makes every LLM call, through plain `fetch` to OpenAI-compatible endpoints, with a provider chain read from `LLM_CHAIN`. Every attempt is budgeted and recorded. Strict JSON schema is used where the provider supports it, and JSON mode plus the schema in the prompt where it does not. The design fits two short, structured jobs. Nothing here needs an SDK.

## [AI-001] Provider chain, fallback and timeouts

- Category: Architecture
- Severity: Informational
- Status: Implemented
- File: `backend/src/integrations/llm/client.ts`
- Code Location: `callChain` (lines 204–235), `attempt` (159–197), constants `ATTEMPT_TIMEOUT_MS` and `TOTAL_TIMEOUT_MS` (45–48)
- Description: The chain tries each `provider:model` in order. Providers without a key are skipped without a call. Every attempt is preceded by `allow()` (kill switch, daily cap, per-minute cap) and followed by `record()`.
- Current Implementation: Default chain `deepseek:deepseek-flash, groq:openai/gpt-oss-120b, gemini:gemini-3.1-flash-lite, gemini:gemini-3.5-flash-lite` (`env.ts` line 5). Each attempt is bounded by `min(20 s, time left)`, and the whole chain by 60 s, which is under the 100 s after which the Cloudflare tunnel drops a request. A refusal, 429, 5xx, timeout, `finish_reason` of `length` or `content_filter`, or a reply the parser rejects moves to the next model. `attempt` never throws. A failed accounting write is logged and does not discard a good reply.
- Problem: None found.
- Why It Matters: A free-tier chain fails often (Gemini allows 20 requests per day per model on this key). Falling through quietly is what keeps the demo working.
- Recommended Solution: Keep as is.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: Read the code; `backend/test/unit/llmClient.test.ts` passes (part of the 500 backend tests, run against a throwaway database on 8 November). Live: two assistant turns answered within about 10 s each.

## [AI-002] Provider request settings: strict schema, JSON mode, reasoning effort, DeepSeek thinking off

- Category: Architecture
- Severity: Informational
- Status: Implemented
- File: `backend/src/integrations/llm/client.ts`
- Code Location: `PROVIDERS` (63–94), `buildBody` (110–138)
- Description: Gemini and Groq get `response_format: json_schema` with `strict: true`. OpenRouter and DeepSeek get `json_object` with the schema appended to the system prompt. All except DeepSeek get `reasoning_effort: "low"`; DeepSeek gets `thinking: {type: "disabled"}`. `temperature: 0` everywhere. Groq's output cap is sent as `max_completion_tokens`.
- Current Implementation: As above, matching `docs/spec/ai.md` (Provider, Request settings).
- Problem: None in the code. Two small points:
  1. For non-strict providers the schema text is appended only when the first message is a system message. Both callers always send one, so this holds today, but nothing enforces it.
  2. DeepSeek's `thinking` field and the `deepseek-flash` model name could not be checked against DeepSeek's live documentation in this audit (no key was used). The spec's bake-off table (30 October) is the only evidence.
- Why It Matters: Strict schema removes a whole class of parse failures. JSON mode on DeepSeek relies on the zod parse plus the server validator, which is the right backstop.
- Recommended Solution: Optional: assert in `buildBody` that `messages[0].role === "system"` (one line), so a future caller cannot silently lose the schema for DeepSeek.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: Read the code; `llmClient.test.ts`. Confirm DeepSeek parameters once against its API docs with the real key in a local session (one call).

## [AI-003] The AI spec contradicts itself on how the agent calls tools

- Category: Documentation
- Severity: Low
- Status: Partially Implemented
- File: `docs/spec/ai.md`
- Code Location: line 37 ("OpenAI-style `tools` with `tool_choice: "auto"`") versus line 129 (Job 2: "Each step is one JSON reply ... instead of a provider's own tool-calling format")
- Description: The code follows line 129: a JSON step protocol (`agentRunner.ts`), no `tools` field, no `tool_choice`. Line 37 still describes the earlier design.
- Current Implementation: JSON step protocol, max 6 steps, and a unit test named "never forces a tool choice".
- Problem: A judge or new developer reading the spec top to bottom gets two different answers.
- Why It Matters: The spec is the project's main technical documentation, and Technological Implementation judges may read it.
- Recommended Solution: Change line 37 to: "Agent: a JSON step protocol (see Job 2), at most 6 steps, every tool input validated with zod." I cannot edit `docs/spec/**`; this is for the spec owner.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: Read both lines after the edit.

## [AI-004] Plain fetch, no LLM SDK

- Category: Architecture
- Severity: Informational
- Status: Implemented
- File: `backend/src/integrations/llm/client.ts`
- Code Location: whole file (235 lines)
- Description: Four providers through one OpenAI-compatible request shape, with zod 4's `z.toJSONSchema` for schemas.
- Current Implementation: No SDK dependency. Provider differences live in one `PROVIDERS` table.
- Problem: None. An SDK would add a dependency per provider (or a multi-provider SDK), plus their own retry and timeout behaviour that would have to be turned off to keep the chain's 20 s / 60 s budget and per-attempt accounting.
- Why It Matters: Fewer dependencies, one place to read, predictable timeouts.
- Recommended Solution: Keep. Do not add an SDK.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: `backend/package.json` has no LLM SDK.

## [AI-005] Model fit for the two jobs

- Category: Model selection
- Severity: Informational
- Status: Implemented
- File: `docs/spec/ai.md` (bake-off table); `backend/scripts/bakeoff.ts`
- Code Location: `DEFAULT_LLM_CHAIN` in `backend/src/config/env.ts` line 5
- Description: Both jobs are short, structured and low-reasoning: one schema fill, and a tool loop over five read-only tools. Small, cheap, fast models are the right class. The order is chosen by measured accuracy (DeepSeek 20/20 after validation, Groq gpt-oss-120b 19/20), then free capacity.
- Current Implementation: Bake-off run 30 October with ten fixtures. `gpt-oss-20b` was correctly left out because it returned complete readings with wrong deadlines, which the validator cannot catch (see AI-021 for the date check that would).
- Problem: The bake-off measures the rule reader only. The agent's model choice is unmeasured (see AI-031).
- Why It Matters: The live turns I ran were correct and grounded (they called `get_status` and two `simulate_outcome`s before answering), but two samples are not a measurement.
- Recommended Solution: See AI-031.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: AI-031
- Verification Method: Re-run `yarn bakeoff --runs 2` after any prompt or chain change, as the spec says.

## [AI-006] The repeat-paste cache only helps the three demo texts

- Category: Cost
- Severity: Informational
- Status: Implemented
- File: `backend/src/services/extract.service.ts`
- Code Location: `ruleHash` (84–86), `cachedReading` (96–100), `createContract` (224–241)
- Description: The cache key is `sha256(rule_text + reference_at)`. For a real paste, `reference_at` is "now", so the same chat pasted a second later misses. Only the fixture texts (fixed reference time) can hit.
- Current Implementation: As designed in the spec: "Judges who all press Use the sample cabin chat cost one call, not hundreds." Cache hits are recorded with `cached = true` and count against no cap.
- Problem: None for the stated goal, but the behaviour is easy to misread as a general cache. It also makes plan creation from the sample chat free of AI cost, which matters for MI-020 (the demo-wide plan cap can be filled without spending AI quota).
- Why It Matters: Correctly saves quota during judging.
- Recommended Solution: Add one sentence to `ai.md`: "In practice only the fixture texts hit the cache, because a real paste's reference time is the moment it was pasted."
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: MI-020
- Verification Method: `backend/test/integration/extract.test.ts` covers the cache; read the key.
