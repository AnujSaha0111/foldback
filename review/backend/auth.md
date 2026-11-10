# Authentication and authorization

Owner: Manveer. Reviewed on 10 November 2026 at commit `196f4f9`.

Files read: `backend/src/services/{auth.service,token,session,password}.ts`, `backend/src/http/{cookies,clientIp}.ts`, `backend/src/http/middleware/{auth,originCheck,rateLimit}.ts`, `backend/src/controllers/auth.*`, `backend/src/routes/*.ts`, `backend/src/realtime/io.ts`, `backend/src/repositories/{users,contracts}.repo.ts`, and the AI routes' ownership checks (`agent.service.ts:22`, `extract.service.ts:264-274`, `confirm.service.ts:53`). AI internals are Ravi's.

## Verified as implemented

| Check | Evidence |
|---|---|
| Cookie flags | `fb_session`: httpOnly, Secure, SameSite=Lax, path `/`, `COOKIE_DOMAIN` in production, 7-day `maxAge` (`cookies.ts:8-41`). The token is never in a response body. |
| JWT | HS256 pinned on verify (`algorithms: ["HS256"]`), so `none` and RS/HS confusion are refused. `JWT_SECRET` at least 32 characters (`env.ts`). Claims validated with zod (`token.ts`). `token.test.ts`. |
| Guests | Real users with `kind = guest`, no email, `expires_at` 7 days out. An expired guest's token is refused even before the sweep runs (`session.ts:16`). The sweep runs on boot and every 6 hours and skips guests holding live money. |
| Owner-only access | Every contract read and write goes through `findOwned` / `lockDraft(client, userId, …)` / `ownsContract`, so another user's plan answers `404 not_found`, the same as a missing one. Malformed ids are also 404 (`contracts.controller.ts:22-27`). Socket `contract:join` checks ownership (`io.ts:83-91`). Tests: `contracts-read.test.ts`, `resolve.test.ts` "is only for the plan's owner". |
| Pay link as a capability | `shr_` + 22 base64url characters. Public routes return only the payer view: no PayPal ids, no other people's statuses beyond `held_count` (`shares.service.ts`). The share room joins only for an existing share. |
| Origin check | Every non-GET under `/api` must carry an allowed `Origin` (or `Referer` when `Origin` is absent); `Origin: null` is refused (`originCheck.ts`). Pay routes are covered too. Production preflight from a foreign origin got no `Access-Control-Allow-Origin`. |
| Passwords | bcrypt cost 12, length 10 to 128 and at most 72 UTF-8 bytes (bcrypt's limit), a dummy comparison for unknown emails so both login failures take the same time, one message for both (`password.ts`, `auth.service.ts:53-64`). |
| Rate limits on auth | login 10 per 15 min per IP + email, signup 5 per hour per IP, guest 5 per day per IP (`rateLimit.ts:41-43`). `limits.test.ts`. |

## [BE-013] "Try it as a guest" allows 5 per IP per day, so judges behind one office or VPN address can be refused

- Category: Rate limiting / judge-facing availability
- Severity: Medium
- Status: Implemented (limit too tight for the judging setting)
- File: `backend/src/http/middleware/rateLimit.ts`
- Code Location: `rateLimit.ts:42-43` (signup 5 per hour, guest 5 per day), `:116`; AI per-IP limits `aiIpDay` 60
- Description: Guest sign-in is the only path the landing page offers without an account. It is limited to 5 per IP per 24 hours, in process memory.
- Current Implementation: The key is `req.ip`, which behind the tunnel is the visitor's public address. A corporate network or VPN puts many people behind one address.
- Problem: The sixth "Try it as a guest" from one address in a day gets `429 rate_limited`. That fits 7 judges sharing an egress address, or one judge retrying in several browsers. The counter also resets on every deploy (BE-019), so the outcome depends on deploy timing.
- Why It Matters: The guest button is the judges' front door, and Stage One checks for a working build.
- Recommended Solution: For the judging window, raise the guest limit to around 50 per IP per day and add a global ceiling (for example 500 guests per day, counted in Postgres from `users.created_at`), which bounds abuse better than a per-IP limit. Keep signup at 5 per hour. The AI cost is already capped globally by `AI_DAILY_CALLS` in Postgres.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: `limits.test.ts`: the 6th guest from one IP succeeds; the global ceiling refuses after N.

## [BE-014] Signup reveals whether an email is registered, and the spec contradicts itself about it

- Category: Account enumeration / spec drift
- Severity: Low
- Status: Implemented as `api.md` says, contrary to `architecture.md`
- File: `backend/src/services/auth.service.ts`, `docs/spec/api.md`, `docs/spec/architecture.md`
- Code Location: `auth.service.ts:48`; `api.md:32`; `architecture.md:252`
- Description: `POST /api/auth/signup` with a taken email answers `409 email_taken` "An account with that email already exists". `architecture.md` says "Login and signup error messages never reveal whether an email exists"; `api.md` documents `email_taken`.
- Current Implementation: The timing is equalised (the hash is computed before the insert), but the status code and message differ, so enumeration is one request per email, limited by 5 signups per hour per IP.
- Problem: The two contract files disagree (team rule: report, do not pick).
- Why It Matters: Low for a hackathon demo with no real users. A payments-company reviewer may notice.
- Recommended Solution: Decide which spec line wins. If enumeration should be impossible, answer signup with `201` and the same body either way, and send nothing (there is no email delivery), or accept the trade-off and delete the sentence from `architecture.md`.
- Implementation Complexity: Low
- Breaking Change Risk: Low (the frontend branches on `email_taken` today)
- Dependencies: Nishit, if the frontend message changes.
- Verification Method: `auth.test.ts` signup with a taken email.

## [BE-015] Sessions cannot be revoked before their 7-day expiry

- Category: Session management
- Severity: Low
- Status: Implemented as specified (stateless)
- File: `backend/src/services/token.ts`, `backend/src/controllers/auth.controller.ts`
- Code Location: `token.ts:4`; `auth.controller.ts:56-59` (logout clears the cookie only)
- Description: The session is a stateless JWT. Logout removes the cookie from that browser, but a copied token stays valid for up to 7 days. There is no password change or reset route, and no "sign out everywhere".
- Current Implementation: As the spec describes. The user row is re-read on every request, so deleting the user does end the session.
- Problem: No way to cut off a leaked token for a member account.
- Why It Matters: Low for a demo. It is the usual first question in an auth review.
- Recommended Solution: Add `users.session_epoch integer NOT NULL DEFAULT 0`, put it in the token as a claim, compare it in `userFromToken` (already loads the user, so no extra query), and increment it on logout. A new migration, about 10 lines.
- Implementation Complexity: Low
- Breaking Change Risk: Low (existing tokens without the claim can be treated as epoch 0)
- Dependencies: Migration `0003_*`, second review (auth).
- Verification Method: `auth.test.ts`: log out, then reuse the old cookie and expect `401 unauthenticated`.
