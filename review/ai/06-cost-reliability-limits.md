# Cost, reliability and limits

Owner: Ravi. Sources: `backend/src/services/aiBudget.service.ts`, `backend/src/repositories/aiUsage.repo.ts`, `backend/src/http/middleware/rateLimit.ts`, `backend/src/config/env.ts`, `backend/src/integrations/llm/client.ts`, `backend/src/services/housekeeping.service.ts`, `deploy/compose.yml`, `docs/spec/ai.md` (Cost and abuse limits, prices).

Prices below are the ones written in `docs/spec/ai.md` (DeepSeek `deepseek-flash`: $0.15 per million input tokens and $0.60 per million output off-peak, double at peak). I did not verify them against DeepSeek's live price page, so every figure here is an estimate.

## Summary

Every limit the spec lists exists in code, and every attempt (fallbacks included) is recorded in `ai_usage` and counted before the next one. Cache hits are recorded but count against nothing. When every provider fails, the rule reader asks the organizer to restate the rule and the assistant answers 503 with "The board and buttons still work", which is what I saw in the code and tests. The weak point is the global per-minute cap of 12 attempts: one assistant turn takes 3 to 6 attempts, so a few people asking at once will see "Too many requests from your connection" (AI-027). The $2 DeepSeek balance is comfortable for normal judging but not for abuse, and nobody is alerted when it runs out (AI-029).

## [AI-027] The global per-minute cap is small next to the assistant's step count, and its message blames the user

- Category: Limits / reliability
- Severity: Medium
- Status: Partially Implemented
- File: `backend/src/services/aiBudget.service.ts`, `backend/src/services/extract.service.ts`, `backend/src/integrations/llm/agentRunner.ts`
- Code Location: `allow()`: `countAttemptsSince(pool, 60) >= env.AI_GLOBAL_PER_MIN` returns `"busy"` (aiBudget 35–40); `budgetError("busy")` returns "Too many requests from your connection. Wait a minute and try again." (extract.service 88–93); `AI_GLOBAL_PER_MIN` default 12 (env.ts 71)
- Description: The cap counts provider attempts in the last 60 seconds across all users. One assistant turn is one attempt per step: my live "What happens if Maya Shah doesn't pay?" used 4 steps (get_status, two simulate_outcome, reply), and "Move to the deadline" used 3. A turn can also hit the cap halfway through its loop.
- Current Implementation: The cap was set below Gemini Flash-Lite's 15 requests per minute (`ai.md`). DeepSeek, first in the chain since 30 October, has much higher limits ("2,500 concurrent" in the bake-off table).
- Problem: Three judges asking the assistant within the same minute (12 attempts) block the fourth person, including on the rule reader. The message then says the problem is "your connection", which is wrong: it is a global, demo-wide limit. A turn that hits the cap mid-loop has already spent its earlier steps.
- Why It Matters: Judging and video recording are exactly when several people use the demo at once. A wrong error message on the AI feature undercuts the Design and Technological Implementation scores.
- Recommended Solution:
  1. Raise `AI_GLOBAL_PER_MIN` to about 40 on production now that DeepSeek leads the chain. It is an env var; no code change. The daily cap (600) still bounds the spend.
  2. Split the copy: `daily` and `busy` (global) should say "The demo's AI is busy for a moment. Try again in a minute; the board and pay links still work.", and keep "your connection" for the per-IP limiter only.
  3. Check `allow()` once per turn for the expected steps (for example, require 3 free slots before starting an assistant turn), so a turn does not stop halfway.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Manveer (production env); `ai.md` table update.
- Verification Method: A stubbed test with `AI_GLOBAL_PER_MIN=4` and a 4-step stub: the second concurrent turn should get the global-busy copy, not "your connection". On production, read the `ai_usage` per-minute peak during the video rehearsal.

## [AI-028] Caps are checked, then spent, not reserved; accounting is one row per attempt

- Category: Limits / accounting
- Severity: Low
- Status: Implemented
- File: `backend/src/services/aiBudget.service.ts`, `backend/src/repositories/aiUsage.repo.ts`, `backend/src/integrations/llm/client.ts`
- Code Location: `allow()` counts, then `attempt()` calls, then `record()` inserts (client.ts 215–231)
- Description: Each attempt runs two `count(*)` queries, calls the provider, then inserts a row with provider, model, tokens, success, route, user, plan and an HMAC of the IP. Token counts are 0 for refused or timed-out attempts.
- Current Implementation: As described. Old rows are deleted after 90 days by `yarn housekeeping`, run by `deploy/launchd/com.foldback.housekeeping.plist` as the table owner (the app role cannot delete).
- Problem: Two requests arriving together can both see 599 of 600 and both proceed, so a cap can be exceeded by the number of concurrent requests. That is a handful of calls at most, so it is acceptable. Refused and timed-out attempts record 0 tokens, so `ai_usage` slightly understates input tokens actually billed by DeepSeek on a timeout.
- Why It Matters: The caps protect a shared free quota and a prepaid balance; small overshoots are harmless.
- Recommended Solution: None required for the hackathon. If it ever matters, reserve with one `INSERT … RETURNING` before the call and update the row after.
- Implementation Complexity: Medium
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: `backend/test/unit/aiLimits.test.ts`, `test/integration/limits.test.ts`.

## [AI-029] The $2 DeepSeek balance through judging (1 to 15 December)

- Category: Cost
- Severity: Medium
- Status: Needs Verification
- File: `docs/spec/ai.md` (Provider), `backend/src/config/env.ts` (`AI_DAILY_CALLS`)
- Code Location: `DEFAULT_LLM_CHAIN`; `AI_DAILY_CALLS` default 600
- Description: Estimates from the spec's prices:
  - Extraction: about 1,300 tokens, about 0.06 cents at peak, so $2 covers about 3,000.
  - Assistant turn: 3 to 6 steps. Each step resends the system prompt, the tool list and the growing tool results, so a 4-step turn is roughly 7,000 input and 400 output tokens, about 0.27 cents at peak. $2 covers roughly 700 turns at peak, or about 1,400 off-peak.
  - Ceiling: the daily cap of 600 attempts, all spent on DeepSeek at about 2,000 tokens each, costs about $0.40 per day at peak. Fifteen saturated days would be about $6.
- Current Implementation: When the balance reaches zero, DeepSeek refuses and the chain moves to free Groq, then Gemini. So the demo keeps working, on Groq's 1,000 requests per day and 8,000 tokens per minute (about 5 calls a minute).
- Problem: Normal judging (seven judges, a few turns each) costs cents. Sustained abuse within the caps, or the team's own rehearsals, could empty the balance before 15 December. Nobody would notice, because the switch to Groq is silent and Groq's per-minute token limit is far tighter.
- Why It Matters: The demo would get slower and more often "busy" in the middle of judging, with no alert.
- Recommended Solution:
  1. Before 1 December, read the DeepSeek balance and the `ai_usage` totals by provider. Top up only if the trend says so (a team decision; it is real money).
  2. Add a daily log line (or a `/metrics` gauge) with yesterday's attempts by provider and success rate. Manveer owns metrics; this is a cross-reference.
  3. Lower `AI_DAILY_CALLS` to about 300 for the judging window. That still leaves room for about 75 assistant turns a day, and roughly halves the worst-case spend.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Manveer (metrics and production env), team decision on any top-up.
- Verification Method: A SQL count on `ai_usage` grouped by provider and day (run by the operator, not by this audit; I did not touch production data).

## [AI-030] Per-IP AI limits depend on the real client IP surviving the tunnel

- Category: Limits
- Severity: Medium
- Status: Needs Verification
- File: `deploy/compose.yml`, `backend/src/app.ts`, `backend/src/http/middleware/rateLimit.ts`
- Code Location: `TRUST_PROXY: "1"` (compose.yml line 66); `app.set("trust proxy", env.TRUST_PROXY)` (app.ts 59); `ipKey = ipKeyGenerator(req.ip)`
- Description: Traffic arrives through Cloudflare's edge, then `cloudflared` on the host, then the Docker port on 127.0.0.1:8787. With one trusted hop, Express takes `req.ip` from the last `X-Forwarded-For` entry, which `cloudflared` sets to the visitor's address.
- Current Implementation: The configuration looks right on paper. `CF-Connecting-IP` is not used.
- Problem: If the Colima/Docker port forward adds its own hop, or `cloudflared` does not append the address as expected, every visitor shares one IP key. Then "10 AI calls per IP per minute" and "60 per day" would become demo-wide limits, and five guest sign-ups per day would be shared by everyone. I could not verify this without production logs.
- Why It Matters: If wrong, one busy judge could lock every other judge out of guest sign-up and the AI for a day.
- Recommended Solution: Manveer to check once in production: log `req.ip` (hashed, as `ai_usage` already stores it) for two requests from two different networks, and confirm the hashes differ. If they do not, key on `CF-Connecting-IP`, which only Cloudflare can set, since the origin is not reachable except through the tunnel.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Manveer (BE, infrastructure)
- Verification Method: Two `ai_usage.ip_hash` values from two networks differ.
