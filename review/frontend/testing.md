# Frontend: testing

State on `review-nishit`: 44 Jest suites with 215 tests, all passing (40 suites and 203 tests on `main` before this work). The tests use Testing Library with jsdom, mock RTK Query hooks at the module boundary, and assert on what a person sees: roles, names and text. No snapshot tests.

The critical flows are covered:
- The pay page: hold, return, cancel, the retry ladder, the unknown result, keeping or dropping the token, and the busy state while leaving.
- Controls and the Paused banner.
- The assistant: chips, tools, proposals approved through the clock route with `viaAgent`, drafts, and the failed-question rollback.
- The rule reader: read, clarify, confirm.
- Auth forms, the header's 401 redirect, and `proxy`.
- Status maps, formatting, `safeNext`, and the command menu.

## [FE-080] The Bryntum scheduler component has no unit test

- Category: Test coverage
- Severity: Medium
- Status: Missing
- File: `frontend/src/features/board/components/SchedulerPanel/FoldbackScheduler.tsx`
- Code Location: the column renderers (`renderLinks`), `onCellClick` (copy, open, popup), the Proposed marker, the short-bar label rule
- Description: `SchedulerPanel` is tested with the scheduler mocked. The component that turns the projection into Bryntum config, and that handles the Copy link and Open link clicks, is not.
- Current Implementation: checked by hand on production by the user.
- Problem: a regression in the pay-link column or the click routing would only show in a demo.
- Why It Matters: it is the Bryntum integration, which one of the judges cares about directly.
- Recommended Solution: pull the pure parts (the column definitions, `renderLinks`, the cell-click decision, the time-range markers) into a `schedulerConfig.ts` and unit-test those without loading Bryntum.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: new unit tests.

## [FE-081] No end-to-end test of the real flow

- Category: Test coverage
- Severity: Low
- Status: Missing
- File: —
- Code Location: —
- Description: No browser test runs paste → read → confirm → open a pay link → PayPal sandbox → back → held.
- Current Implementation: the user ran this by hand on production after each phase.
- Problem: it stays manual.
- Why It Matters: an automated run would protect the demo path. It cannot be done well before 12 November, because PayPal sandbox login needs credentials, and those must not go into a test.
- Recommended Solution: after judging, add Playwright against a preview deploy with a fake PayPal return (the backend's fixtures already model PayPal). Playwright is not on the approved list, so it needs approval.
- Implementation Complexity: High
- Breaking Change Risk: Low
- Dependencies: Manveer (a test mode on the API), and approval of a dependency.
- Verification Method: CI run.

## [FE-082] Landing components are mostly untested

- Category: Test coverage
- Severity: Low
- Status: Partially Implemented
- File: `frontend/src/features/landing/components/*`
- Code Location: only `LiveHolds` and the page render have tests
- Description: The scroll scenes are visual and motion-driven, so unit tests would add little. Their reduced-motion paths matter more.
- Current Implementation: the landing page render and the `useScrollProgress` hook have tests.
- Problem: small.
- Why It Matters: low risk.
- Recommended Solution: none beyond a visual check per release.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: —

## [FE-083] Session storage could leak between tests

- Category: Test hygiene
- Severity: Low
- Status: Implemented (fixed on `review-nishit`)
- File: `frontend/jest.setup.ts`
- Code Location: `afterEach(() => { if (typeof sessionStorage !== "undefined") sessionStorage.clear(); })`
- Description: The new draft hook writes to session storage. Without clearing it, one test's text would appear in the next test.
- Current Implementation: cleared after every test. Node-environment tests (`proxy`) are skipped by the guard.
- Problem: none left.
- Why It Matters: the tests stay independent.
- Recommended Solution: done.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: the full suite passes in any order.
