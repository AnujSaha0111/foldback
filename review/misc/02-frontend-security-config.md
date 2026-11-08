# Frontend security and deployment configuration

Owner: Ravi. Backend headers belong to Manveer and are only cross-referenced here. Checked on 8 November 2026 with `curl -I` against https://app.foldback.tech and https://api.foldback.tech, plus `frontend/next.config.ts`, `frontend/vercel.json`, `frontend/src/lib/env.ts` and `backend/src/http/cookies.ts`.

## Live headers (frontend)

`GET https://app.foldback.tech/`: `HTTP/2 200`, `strict-transport-security: max-age=63072000`, `server: Vercel`, `cache-control: public, max-age=0, must-revalidate`. No `content-security-policy`, `x-frame-options`, `x-content-type-options`, `referrer-policy` or `permissions-policy`. `http://app.foldback.tech/` returns `308` to HTTPS.

For comparison, the API (`api.foldback.tech`) sends a full helmet set: CSP with `frame-ancestors 'self'`, `x-frame-options: SAMEORIGIN`, `x-content-type-options: nosniff`, `referrer-policy: no-referrer`, HSTS with `includeSubDomains`, and CORP/COOP.

## [MI-007] The web app sends no security headers beyond HSTS

- Category: Security configuration
- Severity: Medium
- Status: Missing
- File: `frontend/next.config.ts`, `frontend/vercel.json`
- Code Location: `next.config.ts` has no `headers()`; `vercel.json` has only a redirect from `foldback.vercel.app`
- Description: Every page, including `/pay/[shareId]` (where a friend presses the Hold button) and `/plans/[id]` (Resolve, clock moves), can be framed by any site, and no Content Security Policy limits scripts.
- Current Implementation: Vercel's default HSTS only.
- Problem:
  - **Clickjacking:** an attacker page can frame a victim's board or a pay page and trick clicks onto "Resolve now" or "Hold my share with PayPal". The PayPal approval is a full-page redirect and still needs the buyer's PayPal login, so the money risk is low, but Resolve on a signed-in organizer's board needs no further step.
  - **No CSP:** there is no XSS found (AI-024), but there is no second line of defence either.
  - **No `nosniff` and no `Referrer-Policy`:** browsers default to `strict-origin-when-cross-origin`, so pay link paths are not leaked cross-origin by default. An explicit policy makes that certain.
- Why It Matters: Security-minded judges (Karthik Ravi, Himraj Singh lenses) may run a header check. The API already does this well, so the gap is visible by contrast.
- Recommended Solution: Add `async headers()` to `next.config.ts` for `source: "/(.*)"` with:
  - `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`.

  Start the CSP in `Content-Security-Policy-Report-Only` with `default-src 'self'; connect-src 'self' https://api.foldback.tech wss://api.foldback.tech; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'`. Check that the board (Bryntum), MUI/Emotion styles and Socket.IO still work, then enforce. Next.js and Emotion inject inline styles and scripts, so a nonce-based CSP is the stricter follow-up.
- Implementation Complexity: Low (headers), Medium (an enforced CSP)
- Breaking Change Risk: Medium for the enforced CSP (inline scripts and styles); Low for the others
- Dependencies: Nishit (frontend config); deploy by hand to Vercel.
- Verification Method: `curl -sI https://app.foldback.tech/pay/x | grep -iE "frame|content-security|nosniff|referrer|permissions"`; securityheaders.com; the board, the assistant and a sandbox hold still work.

## [MI-008] HSTS on the app has no `includeSubDomains` or `preload`

- Category: Security configuration
- Severity: Low
- Status: Partially Implemented
- File: Vercel project settings / `next.config.ts`
- Code Location: response header `strict-transport-security: max-age=63072000`
- Description: The API sets `includeSubDomains`; the app does not. HTTP already redirects to HTTPS (308).
- Current Implementation: Vercel default.
- Problem: Minor. Only matters for subdomains of `app.foldback.tech`, of which there are none.
- Why It Matters: Low; consistency with the API.
- Recommended Solution: Optional: set `Strict-Transport-Security: max-age=63072000; includeSubDomains` in the same `headers()` block. Do not add `preload` unless the team owns the domain long term (preload is hard to undo).
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: MI-007
- Verification Method: `curl -sI https://app.foldback.tech/`.

## [MI-009] Only `NEXT_PUBLIC_API_URL` reaches the browser bundle

- Category: Secrets
- Severity: Informational
- Status: Implemented
- File: `frontend/src/lib/env.ts`, `frontend/next.config.ts`
- Code Location: the only `process.env` reads in `frontend/src` and `next.config.ts` are `NEXT_PUBLIC_API_URL` (2) and `NODE_ENV` (1)
- Description: No server secret is read by frontend code. A production build refuses to run without `NEXT_PUBLIC_API_URL`, so it cannot silently point at localhost.
- Current Implementation: As described.
- Problem: None.
- Why It Matters: The frontend holds no secrets, so Vercel's env settings cannot leak any.
- Recommended Solution: Keep. If Vercel has any non-public env vars set, remove them, because nothing uses them.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: `git grep -n "process\.env" -- frontend/src frontend/next.config.ts`.

## [MI-010] Session cookie and CORS seen from the browser

- Category: Security configuration
- Severity: Informational
- Status: Implemented
- File: `backend/src/http/cookies.ts`; API CORS (Manveer)
- Code Location: `baseOptions` (cookies.ts 10–19)
- Description: The session cookie is `httpOnly`, `secure`, `SameSite=Lax`, `path=/`, with `domain` from `COOKIE_DOMAIN` (so `app.` and `api.` share it). A preflight from `Origin: https://evil.example` to `https://api.foldback.tech/api/auth/me` returned 204 with no `access-control-allow-origin`, so the browser blocks it. `foldback.vercel.app` permanently redirects to `app.foldback.tech` (`vercel.json`), so there is one canonical origin.
- Current Implementation: As described.
- Problem: None found from the browser side.
- Why It Matters: A cross-site request cannot read API responses or send the session cookie with credentials from another origin.
- Recommended Solution: Keep. Manveer owns the server-side CORS list.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Cross-reference Manveer's BE findings.
- Verification Method: `curl -X OPTIONS` with a foreign `Origin`, as above.
