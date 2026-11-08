# Analytics and operations (product side)

Owner: Ravi. Backend logging, metrics and alerting belong to Manveer and are cross-referenced only.

## [MI-023] No product analytics, which is the right default for now

- Category: Analytics
- Severity: Informational
- Status: Implemented (by omission)
- File: `frontend/package.json`, `backend/package.json`
- Code Location: no analytics package (`@vercel/analytics`, `posthog-js`, `react-ga4`, Plausible and similar are all absent)
- Description: The team cannot see how many people visited, tried the guest flow, or used the assistant, except by reading database tables and server logs.
- Current Implementation: None. `ai_usage` gives exact AI usage by route, provider and day; the `users` and `contracts` tables give guest and plan counts.
- Problem: None for privacy (no consent banner needed, MI-003). The trade-off is that the team will not know whether judges actually opened the demo during 1 to 15 December.
- Why It Matters: Useful for the team, invisible to judges.
- Recommended Solution: Do not add a client-side tracker. If the team wants visibility during judging, run one read-only SQL query per day on the server: guests created, plans confirmed, assistant turns and holds placed. The data already exists and nothing is sent to a third party. If a dashboard is wanted, Vercel Web Analytics is cookieless, but update the privacy notice first.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Manveer (server access); MI-001 if anything is added.
- Verification Method: n/a.

## [MI-024] No frontend error monitoring

- Category: Operations
- Severity: Low
- Status: Missing
- File: `frontend/src/app/` (no `error.tsx` / `global-error.tsx` found), no monitoring package
- Code Location: n/a
- Description: A JavaScript error in a judge's browser (for example a Bryntum render failure on an unusual screen size) is invisible to the team. The backend has structured logs and metrics (Manveer's area).
- Current Implementation: None.
- Problem: Silent client failures during judging.
- Why It Matters: The board and the pay page are the demo.
- Recommended Solution: The minimum is an `app/error.tsx` and `app/global-error.tsx` in the design system with a "Reload" button, so a crash is at least graceful (Nishit's area). If the team wants reports, a few lines that `POST` the error message and route to an existing backend log endpoint would do, rather than a third-party SDK. Any new dependency must be on the approved list (`quality.md` §3).
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Nishit (frontend), Manveer (any log endpoint)
- Verification Method: Throw in a test component in development and see the error page.
