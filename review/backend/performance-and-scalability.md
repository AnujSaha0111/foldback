# Backend performance and scalability

Owner: Manveer. Reviewed on 10 November 2026 at commit `196f4f9`. No load test was run: production is off limits, and the local stack shares the machine with unrelated containers, so local numbers would not mean much.

## Verified as implemented

| Check | Evidence |
|---|---|
| No N+1 queries | `readContract` loads the contract with its counts (one `GROUP BY` query), then shares and the last 30 events in parallel. `listByOwner` is one query. `readPublicShare` is two queries for at most 4 shares. |
| Bounded responses | Events capped at 30 in the read model. Shares at most 4 per plan (CHECK). No `SELECT *` in repositories. |
| Hot paths indexed | See `database-and-concurrency.md`. |
| Socket fan-out | One `contract:changed` per committed change to the plan's room, one `share:changed` per share room. A 4-person capture wave emits about 6 events. Each open board refetches 3 tags per event, so about 18 small GETs per board per wave. Sockets are capped at 10 per IP. |
| PayPal token | Cached until 60 s before expiry and dropped on a 401. |

## [BE-019] Per-day rate limits reset on every deploy

- Category: Abuse limits / scalability
- Severity: Low
- Status: Implemented (in-memory by design)
- File: `backend/src/http/middleware/rateLimit.ts`, `backend/src/realtime/io.ts`
- Code Location: `rateLimit.ts:110-130` (express-rate-limit default memory store); `io.ts:49` (`perIp` map)
- Description: Every limiter, including the per-day ones (guest 5, contract creation 15 per user, AI 30 per user and 60 per IP, agent 25 per plan), lives in process memory. CI publishes every merge to `main`, and the Mac redeploys within 5 minutes, which restarts the process.
- Current Implementation: As `architecture.md` describes ("in-memory stores behind an interface"). The money-relevant cap, the global daily AI call count, is in Postgres and survives restarts.
- Problem: On a day with 10 merges, a "per day" limit is really "per deploy". Cost stays bounded by the Postgres cap and DeepSeek's prepaid balance; abuse limits do not.
- Why It Matters: Low. It interacts with BE-013, where the effect runs the other way: judges get lucky or unlucky depending on deploy timing.
- Recommended Solution: Accept for the hackathon and say so in `architecture.md`. For the second instance or for real use, back the per-day limits with Postgres (a small `rate_counters` table keyed by `(key, window_start)`), and keep per-minute limits in memory.
- Implementation Complexity: Medium (if built)
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: Not applicable now.

## [BE-020] What breaks with a second backend instance

- Category: Scalability
- Severity: Informational
- Status: Implemented for one instance, as specified
- File: `backend/src/db/tx.ts`, `backend/src/http/middleware/rateLimit.ts`, `backend/src/realtime/io.ts`, `backend/src/server.ts`
- Code Location: `tx.ts:50-51`; `rateLimit.ts:110`; `io.ts:49`, `:122`; `server.ts:31-36`
- Description: The checklist for running two API containers:
  1. Correct already: advisory locks, unique indexes and guard triggers are in Postgres, so two instances can never run two waves for one plan or send two writes for one share. The guest and draft sweeps are idempotent.
  2. Needs work: the lock-holder cap of 5 is per process, so two instances allow 10 holders against two pools of 10 (still fine). Rate limits are per process, so each instance allows the full limit. The socket per-IP cap is per process. Socket rooms are local, so a change committed on instance A never reaches a board connected to instance B: this is the one that would visibly break, and it needs the Socket.IO Redis or Postgres adapter.
- Current Implementation: One instance on one Mac mini.
- Problem: None today.
- Why It Matters: An engineering-manager judge may ask "how does this scale?". The honest answer is short and already mostly true.
- Recommended Solution: Put this checklist in the README "What's next". The Postgres adapter for Socket.IO avoids adding Redis.
- Implementation Complexity: Medium
- Breaking Change Risk: Low
- Dependencies: A new dependency would need approval (`quality.md` §3).
- Verification Method: Not applicable now.
