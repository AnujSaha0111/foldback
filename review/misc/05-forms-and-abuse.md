# Forms and abuse

Owner: Ravi. Sources: `backend/src/http/middleware/rateLimit.ts`, `backend/src/controllers/*.schemas.ts`, `backend/src/services/extract.service.ts` (`enforcePlanCaps`), `backend/src/repositories/contracts.repo.ts` (`countOwnPlans`), `backend/src/shared/rules.ts`, the sign-in, sign-up, guest, rule reader and pay screens on the live site.

## Limits in place (verified in code)

| Surface | Limit |
|---|---|
| All API routes | 120 requests per minute per IP |
| Sign-in | 10 per 15 minutes per IP and email |
| Sign-up | 5 per hour per IP; `SIGNUPS_ENABLED` kill switch |
| Guest workspace | 5 per day per IP; expires after 7 days |
| New plans | 15 per day per user; 30 per user in total; 200 user-made plans demo-wide (`MAX_DEMO_CONTRACTS`, samples not counted) |
| Rule text | 6,000 characters; clarify answer length capped; 3 clarify rounds |
| AI routes | per user 6/min and 30/day; per IP 10/min and 60/day; global 12 attempts/min and 600/day; 25 assistant turns per plan per day |
| Pay links | checkout 10 per 10 minutes per IP; authorize and sync 20 per 10 minutes per IP |
| Clock and resolve | 30 per minute per user |

All of them are in-memory per process except the AI daily, per-minute and plan caps, which count database rows.

## [MI-018] Sign-up, sign-in and guest: validation and bot protection

- Category: Forms
- Severity: Low
- Status: Implemented
- File: `backend/src/http/middleware/rateLimit.ts`, auth schemas and services (Manveer), `frontend/src/features/auth/`
- Code Location: `DEFAULT_LIMITS.login`, `.signup`, `.guest`
- Description: Fields have visible labels. The password needs at least 10 characters. Sign-in errors are one generic sentence ("Email or password is incorrect."), so they do not reveal which accounts exist. Rate limits apply per IP. There is no CAPTCHA and no email verification.
- Current Implementation: As described.
- Problem: For a sandbox demo this is proportionate: no CAPTCHA keeps the judge path frictionless. The limits are per IP, so their strength depends on AI-030 (whether the real client IP reaches the API).
- Why It Matters: Bot sign-ups cost database rows only; the expensive surfaces (AI, plans) have their own caps.
- Recommended Solution: Keep. Do not add a CAPTCHA before judging. Verify AI-030 first, because if every visitor shares one IP key, five guest sign-ups per day would be shared by everyone.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: AI-030 (Manveer)
- Verification Method: `test/integration/limits.test.ts`; live: a sixth guest from one IP in a day gets 429.

## [MI-019] Rule reader inputs

- Category: Forms
- Severity: Informational
- Status: Implemented
- File: `backend/src/controllers/rules.schemas.ts`, `frontend/src/features/rules/`
- Code Location: `createRuleSchema`, `clarifySchema`
- Description: Text is trimmed, required and at most 6,000 characters. The "Use the sample cabin chat" link means a judge never has to type. Errors show the API's sentence under the button. On the live site the empty state, the character count and the four-step progress are all present.
- Current Implementation: As described.
- Problem: None in validation. Privacy copy is missing at the point of paste (AI-023).
- Why It Matters: This is the first AI touchpoint for every visitor.
- Recommended Solution: Add the AI-023 sentence under the box.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: AI-023
- Verification Method: Live check on `/plans`.

## [MI-020] The demo-wide plan cap can be filled without spending any AI quota

- Category: Abuse / availability
- Severity: Medium
- Status: Partially Implemented
- File: `backend/src/services/extract.service.ts`, `backend/src/repositories/contracts.repo.ts`, `backend/src/shared/rules.ts`
- Code Location: `enforcePlanCaps` (extract.service 211–221); `countOwnPlans(pool, null)` counts every non-sample plan, including drafts (contracts.repo 316–322); `MAX_DEMO_CONTRACTS = 200`; the cache in `createContract` (224–241)
- Description: Once 200 user-made plans exist, every new paste gets "The demo is full right now. Try the sample plans." Pasting the sample cabin chat with `use_fixture_time` hits the repeat-paste cache (AI-006), so it creates a plan without calling a model and without touching any AI cap.
- Current Implementation: Per user: 15 new plans per day, 30 in total. Per IP: 5 guests per day. Plans of expired guests are removed after 7 days.
- Problem: From one IP, 5 guests × 15 plans = 75 plans a day, so three IPs (or one IP for three days) fill the demo. The cap then blocks judges from the "paste a chat, confirm, open a pay link" path in `demo.md` step 5 for up to 7 days, until those guests expire. Unconfirmed drafts count too.
- Why It Matters: That path is the one that shows a real PayPal sandbox hold, and it is the strongest part of the demo for PayPal judges.
- Recommended Solution:
  1. Count only confirmed plans towards the demo-wide cap (exclude `extracting`, `needs_clarification` and `awaiting_confirmation`), and sweep unconfirmed drafts older than 24 hours.
  2. Lower the per-guest total (for example 5 plans per guest; a judge needs one or two).
  3. Raise `MAX_DEMO_CONTRACTS` for the judging window if the database allows; 200 is small.
  4. Optional: during 1 to 15 December, reserve headroom, for example refuse new guest plans past 80 % of the cap while members can still create.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Manveer (backend); the AI-006 cache stays as is.
- Verification Method: An integration test: 200 drafts from many users must not block a new confirmed plan once (1) is in place. On production, a count of user-made plans by status, run by the operator.

## [MI-021] Pay links: unguessable, rate-limited, no personal data asked

- Category: Forms / abuse
- Severity: Informational
- Status: Implemented
- File: `frontend/src/app/pay/[shareId]/`, shares routes (Manveer)
- Code Location: `checkout` and `authorize` limiters
- Description: The pay page asks for nothing: the friend approves in PayPal's own window. Share ids are random. The page is `noindex` and not cached. A sample plan's link says "This is a sample plan. No PayPal payment is possible." (seen live).
- Current Implementation: As described.
- Problem: A pay link shows every participant's full name and the amount to anyone holding the link. That is by design and acceptable for sandbox; worth one line in the privacy notice (MI-001).
- Why It Matters: Privacy expectation for friends who receive a link.
- Recommended Solution: Mention it in MI-001. Optional: show other participants as first names only.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: MI-001
- Verification Method: Live check of a sample pay link (done, 8 November).

## Error, empty and loading states

Covered by Nishit (FE-012, FE-014, FE-022, FE-033, FE-042). Live checks agree: the rule reader's empty state and the assistant's suggested prompts are clear, and the assistant's "busy" message has wrong copy (AI-027).
