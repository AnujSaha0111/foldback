# Performance and accessibility (site-wide)

Owner: Ravi for the site-wide numbers. Nishit owns the frontend implementation and the detailed accessibility and performance audits (`review/frontend/performance.md`, `review/frontend/accessibility.md`); his FE ids are cross-referenced here, not repeated.

## [MI-016] Lighthouse mobile scores could not be measured in this audit

- Category: Performance / accessibility
- Severity: Medium
- Status: Needs Verification
- File: n/a (live site); `.github/workflows/` (no Lighthouse step, see FE-064)
- Code Location: n/a
- Description: I tried three routes to Lighthouse scores for `/`, `/login`, `/signup` and a pay link at mobile settings:
  1. The Lighthouse CLI (`npx lighthouse@12`): not installed, because installing third-party tools needs the human's approval, and none was given in this session.
  2. Google PageSpeed Insights API (runs Lighthouse on Google's side, no install): refused with "Quota exceeded for quota metric 'Queries' … per day" for keyless use on 8 November.
  3. In-browser Performance API from the built-in browser: the numbers were unusable (assets served from cache with 0 bytes transferred, and the hidden browser pane throttles timers). I discarded them rather than report them.
- Current Implementation: No scores exist anywhere in the repo. Nishit found that every public route is over its JavaScript budget (FE-060) and that no Lighthouse CI step exists although the spec says it does (FE-064).
- Problem: Performance, Accessibility, Best Practices and SEO scores per public page are unknown. The SEO category will fail on the missing `robots.txt` (MI-012), and Best Practices may flag the missing headers (MI-007).
- Why It Matters: Judges may run Lighthouse; a red Performance score on mobile is a visible ding.
- Recommended Solution: Run once by hand, with approval, before submission: `npx lighthouse@12 https://app.foldback.tech/ --preset=perf --form-factor=mobile --output=html`, and the same without `--preset` for all four categories, for `/`, `/login`, `/signup` and one sample pay link. Record the four scores per page in `review/reports/ravi.md` or the README. Or press Analyze on https://pagespeed.web.dev/ in a normal browser, which has no quota issue. Fix in the order FE-060, then MI-007 and MI-012.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: FE-060, FE-064 (Nishit); approval for `npx lighthouse`.
- Verification Method: Four scores per page, recorded with the date.

## [MI-017] Site-wide accessibility checks

- Category: Accessibility
- Severity: Informational
- Status: Partially Implemented
- File: see Nishit's `review/frontend/accessibility.md`
- Code Location: n/a
- Description: Checked by eye on the live site on 8 November at 1440 and 375 px:
  - The pay page shows "This is a hold, not a charge." and the status above the fold at 375 × 812.
  - Statuses are always words (Held, Waiting), never colour alone.
  - The board's people are also reachable through a "Show a person" select, which helps keyboard and screen-reader users of the Bryntum grid.
  - No cookie banner or other overlay blocks content.
- Current Implementation: As above. Contrast, 200 % zoom, forced colours, touch targets and screen readers are covered by Nishit (FE-041, FE-045, FE-047, FE-053).
- Problem: No automated accessibility score yet (see MI-016).
- Why It Matters: Accessibility is part of Design for every judge lens.
- Recommended Solution: Run Lighthouse's Accessibility category and axe once on `/`, `/plans` and a pay link (part of MI-016), then hand any failures to Nishit's FE list.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: MI-016; Nishit's FE-04x findings.
- Verification Method: Lighthouse Accessibility score of 90 or more on each page.
