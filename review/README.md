# Foldback audit

Three makers audited the whole project in parallel, each on their own branch (`review-nishit`, `review-manveer`, `review-ravi`). This folder holds their findings, their reports and their independent evaluations through the eyes of the seven judges.

## Owners

| Area | Owner | Folder |
|---|---|---|
| Frontend and UI/UX (the only area with code changes in this audit) | Nishit | `frontend/` |
| Backend, PayPal money flows, database, infrastructure and deployment | Manveer | `backend/` |
| AI (rule reader, assistant, model chain, prompts, guardrails, cost) | Ravi | `ai/` |
| Legal, privacy, SEO, analytics, forms and abuse, frontend security configuration, developer experience and docs | Ravi | `misc/` |

Each maker writes only in their own folder, their own report in `reports/` and their own section of each file in `judges/`. This file belongs to Nishit; ask him to change it.

## Finding IDs

| Prefix | Area | Example |
|---|---|---|
| FE | Frontend and UI/UX | FE-001 |
| BE | Backend, money flows, data, infrastructure | BE-001 |
| AI | AI | AI-001 |
| MI | Miscellaneous (legal, SEO, docs, and so on) | MI-001 |
| J | A recommendation driven by a judge evaluation, with the maker's name | J-NISHIT-001 |

Cross-reference another maker's ID instead of repeating their finding.

## Finding format

```markdown
## [FINDING-ID] Finding Title

- Category:
- Severity: Critical / High / Medium / Low / Informational
- Status: Missing / Partially Implemented / Implemented / Needs Verification
- File:
- Code Location:
- Description:
- Current Implementation:
- Problem:
- Why It Matters:
- Recommended Solution:
- Implementation Complexity: Low / Medium / High
- Breaking Change Risk: Low / Medium / High
- Dependencies:
- Verification Method:
```

## Severity

- **Critical:** severe vulnerabilities, major data loss, or serious functionality failures. For Foldback this includes any path that double-captures, captures in the release direction, or loses a hold.
- **High:** significant bugs, vulnerabilities, or architectural weaknesses.
- **Medium:** meaningful quality, performance, or usability improvements.
- **Low:** minor improvements.
- **Informational:** observations and optional suggestions.

## Judge rubric (all 21 evaluations)

Each maker scores each judge's view of the whole project on the hackathon's five Stage Two criteria, from 1 to 5:

| Score | Meaning |
|---|---|
| 1 | Missing or broken |
| 2 | Weak |
| 3 | Solid but ordinary |
| 4 | Strong |
| 5 | Exceptional |

Criteria: Technological Implementation, Design, Potential Impact, Innovation/Idea, Presentation. One sentence of evidence per score, then the average. The lens changes with the judge; the anchors never do, so the evaluations can be compared.

The lenses come from each judge's stated role. Nobody's private opinions, preferences or scoring are claimed.

## Status

| File | Owner | Status |
|---|---|---|
| `frontend/*.md` | Nishit | Complete |
| `backend/*.md` | Manveer | Pending |
| `ai/*.md` | Ravi | Pending |
| `misc/*.md` | Ravi | Pending |
| `reports/nishit.md` | Nishit | Complete |
| `reports/manveer.md` | Manveer | Pending |
| `reports/ravi.md` | Ravi | Pending |
| `judges/*.md`, Nishit's sections | Nishit | Complete |
| `judges/*.md`, Manveer's sections | Manveer | Pending |
| `judges/*.md`, Ravi's sections | Ravi | Pending |
| `judges/*.md`, Consolidated Observations | All, after the three reviews | Pending |
