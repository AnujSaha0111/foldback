# Audit Completion Report

Maker: Nishit. Branch: `review-nishit`, from `main` at `5f72725`. Date: 5 November 2026.

## Assigned Responsibilities

- Frontend review:
  - Component architecture.
  - State and data fetching.
  - Hooks and routing.
  - The money UI.
  - Accessibility, responsiveness, performance and testing.
- The complete 20-point UI/UX audit, with implementation in `frontend/`.
- The shared `review/` skeleton and `review/README.md`.
- An independent evaluation of the whole project for each of the seven judges.

## Total Findings

43 frontend findings (FE-001 to FE-083, in `review/frontend/`). 12 of them were fixed on this branch. 15 judge-driven recommendations (J-NISHIT-001 to J-NISHIT-015, in `review/judges/`).

## Severity Distribution
- Critical: 0
- High: 0
- Medium: 11
- Low: 22
- Informational: 10

## Most Important Findings

1. **FE-064 / FE-060: performance budgets are neither met nor measured.** The spec says Lighthouse CI enforces them, but no Lighthouse step exists. React DOM plus the Next runtime alone are about the size of the `/pay` budget. The spec and the code disagree, so the team decides: measure by hand and re-baseline, or add the CI step.
2. **FE-032: Resolve now gives no preview of what it will do.** It is final, and the outcome is already computable server side.
3. **FE-040 / FE-041 / FE-047: accessibility.**
   - Focus rings were invisible in forced-colours mode (fixed).
   - In-grid board buttons are unverified for the keyboard.
   - Contrast, 200 % zoom and screen readers are unverified.
4. **FE-051: the board on a phone.** The Person and Pay link columns crowd out the timeline.
5. **FE-080: the Bryntum component has no unit tests,** while one judge evaluates the Bryntum use directly.
6. **Cross-area, for Manveer to confirm: no timed resolver.** Plans resolve only after the last hold, on a clock move or on Resolve. The backend's only timers are the guest and draft sweeps. Holds on an untouched plan after its deadline would stay until PayPal expires them. This is in the judge evaluations (Karthik Ravi, Himraj Singh, Nathaniel Olson); it is not an FE finding.

## Judge Evaluations Completed
- Jo Franchetti: complete. Average 3.4.
- Eddie Jaoude: complete. Average 3.4.
- Marco Podien: complete. Average 3.6.
- Karthik Ravi: complete. Average 3.4.
- Himraj Singh: complete. Average 3.4.
- Nathaniel Olson: complete. Average 3.4.
- Mats Bryntse: complete. Average 3.4.

The same pattern runs through all seven: Technological Implementation 4, Design 4, Innovation 4, Potential Impact 3, and Presentation 2 (3 for Marco Podien, whose lens weighs the self-demonstrating live app). Presentation is low because the README is nine lines and there is no video yet. It is the cheapest score to raise.

## Most Important Recommendations

1. **J-NISHIT-001: a README judge guide.** The idea, the live link, a 2-minute tour, a table of the four PayPal calls and their idempotency keys, an architecture diagram, local setup, and "What's next".
2. **J-NISHIT-002: the video.** A hold, then the demo clock to the deadline, then capture; then a release. Name the PayPal call on screen.
3. **J-NISHIT-010: keep the demo alive from 1 to 15 December.**
   - Renew the Bryntum key before 1 December.
   - Watch the DeepSeek balance.
   - Add an uptime ping that alerts a phone.
   - Reset the sample plans each day.
   - Check backups.
4. **J-NISHIT-003 and J-NISHIT-012: say where the money goes and who it is for.** Today: Foldback's sandbox merchant account. Next: payouts to the organizer. Explain the difference from Splitwise and from pools.
5. **J-NISHIT-008: a "Money safety" section.** The share state diagram, then tx1 → PayPal → tx2, then unknown results.
6. **J-NISHIT-014: one drag interaction on the Bryntum timeline.** Drag the Now line or the Deadline marker, confirm, then move through the existing clock route.

## Skills, Plugins, and Connectors

| Tool/Skill/Plugin | Purpose | Installation Method | Status | Verification |
|---|---|---|---|---|
| `ponytail:ponytail` (plugin `ponytail@ponytail` 5.3.3) | Smallest-change discipline for every edit | Already installed (local scope, this project) | Active | The SessionStart hook reported "PONYTAIL MODE ACTIVE — level: full" in this session. Its rules shaped what was not built (no undo toasts with nothing to undo, no swipe sheets). |
| `ponytail-audit`, `ponytail-review`, `ponytail-debt`, `ponytail-gain`, `ponytail-help` | Ponytail's reporting commands | Same plugin | Installed | Listed in the session's skills. Not invoked: the main skill covered the need. |
| `better-accessibility` (project skill) | WCAG 2.2 checklist | Already in `.claude/skills/` | Working | Invoked in this audit; its pattern list drove `accessibility.md` and found FE-041 and FE-046. |
| `better-ui`, `better-colors`, `better-typography`, `better-writing`, `better-layout` (project skills) | Surfaces and motion, colour, type, copy, layout | Already in `.claude/skills/` | Working | Invoked earlier in this session on the whole frontend. Their rules were applied here: tabular numbers, `text-wrap`, safe areas, touch targets, transitions. |
| `better-interface` (project skill) | Umbrella over the better-* skills | Already in `.claude/skills/` | Installed | Not invoked separately; its sub-skills were run directly. |
| `accessibility-review` (project skill) | WCAG 2.1 AA audit template | Already in `.claude/skills/` | Working | Invoked earlier in this session; superseded here by `better-accessibility` (WCAG 2.2). |
| `find-animation-opportunities` (project skill) | Where motion helps and where it does not | Already in `.claude/skills/` | Working | Invoked earlier in this session. Its "never animate keyboard-initiated, high-frequency UI" rule set the command menu's zero-duration open. |
| `superfuture-design-review` (project skill) | Design critique | Already in `.claude/skills/` | Working | Invoked earlier in this session on all screens. |
| `hallmark` (user skill) | Design direction for new pages | Already in `~/.claude/skills/` | Working | Invoked earlier in this session for the landing preview. Not used here: no new page was designed. |
| `code-review` (built-in) | Correctness review of a diff | Built in | Working | Used earlier in this session for money changes. Recommended as the second pass on this branch's pay-page change before merge. |
| `simplify`, `security-review` (built-in) | Cleanup and security review | Built in | Available | Not invoked; security configuration belongs to Ravi, backend security to Manveer. |
| Built-in browser (Claude Browser) | Visual and behavioural checks | Built in | Working | Used on a local production build: pay skeleton at 375 px, the command menu (Ctrl+K, filter, Enter), draft restore on reload, 44 px touch targets. |
| Next.js production build + `next start` | Real route bundles | Project tooling | Working | Built `main` and this branch; compared each route's script sizes. |
| New third-party installs | — | — | None | Nothing new was needed, so nothing was installed and no approval was asked. |

Not applicable on this machine: `agent-skills@addy-agent-skills` and `oh-my-claudecode@omc` are installed only for another project, so they were not used.

## Files Created

- `review/README.md`, `review/{backend,ai,misc}/.gitkeep`, `review/reports/{manveer,ravi}.md` (placeholders), `review/judges/*.md` (seven skeletons).
- `review/frontend/`: `ui-ux-20-points.md`, `architecture.md`, `state-and-data.md`, `hooks-and-routing.md`, `money-ui.md`, `accessibility.md`, `responsiveness.md`, `performance.md`, `testing.md`.
- `review/reports/nishit.md` (this file).
- Frontend:
  - `src/components/Skeleton/*`
  - `src/features/command/components/CommandMenu/*`
  - `src/features/rules/useDraft.ts` and its test
  - `src/hooks/useClientValue.ts`

## Files Modified

Frontend only. The full list is in `review/frontend/ui-ux-20-points.md`, "Modified and new files". It includes `jest.setup.ts`, `baseApi.ts`, `Providers`, `globals.css`, `layout.tsx`, `tokens.css`, `media.ts`, `status.ts`, the board, pay, plans and rule-reader screens, `Button`, `DataTable`, `Footer`, `Page`, `ThemeToggle`, `AuthShell`, `PersonCard`, `SchedulerPanel`, `AssistantCard` and `AppHeader`.

No backend, deploy, spec or API-contract file was touched.

## Testing and Verification

- **Gates** in `frontend/`: format, typecheck, lint, knip, dup and test all pass. 44 suites and 215 tests (40 and 203 before). The production build passes.
- **Sizes:** route script sizes compared between `main` and this branch on production builds. `/pay` +1.2 KB gzip, `/` +0.8 KB, auth pages −1.7 to −1.8 KB.
- **Browser, local production build:**
  - The pay skeleton, then the error state.
  - The command menu: open, filter, arrows, Enter.
  - The draft survives reload with no hydration warning.
  - Phone menu and touch targets at 375 px.
  - Dark theme.
- **Review status by category:**
  - Complete: architecture, state, hooks and routing, the money UI (code and tests), responsiveness (code, and the pay page in a browser), performance, testing, the 20 points.
  - Partly verified: accessibility. Contrast, 200 % zoom, screen readers and forced colours were not run.
  - Not verified locally: the board, by rule (Bryntum is not run on this machine). Signed-in data, because production refuses localhost.

## Remaining Issues

- **Check on a preview deploy:**
  - The board's skeleton.
  - 44 px in-grid buttons on a phone.
  - The popup ×.
  - The command menu with real plans.
  - Keyboard reach of the in-grid buttons (FE-040).
- **Check on a real iPhone:** landscape notch and the home indicator (FE-050).
- **Pay-page change:** the only change on the money pages is the Hold button's busy state. It needs a second review pass (`/code-review`) and the user's review, per the project rules.
- **Open Medium findings:** FE-032, FE-035, FE-040, FE-047, FE-051, FE-060, FE-064, FE-080.

## Recommended Next Steps

1. Merge the `review/` skeleton to `main` first, so Manveer and Ravi can write their sections.
2. Review and merge `review-nishit` after a preview-deploy check of the board.
3. Before 11 November: the README judge guide (J-NISHIT-001), the video (J-NISHIT-002), and the spec-versus-code decisions on Lighthouse and the assistant chunk (FE-063, FE-064).
4. Before 1 December: the "Keep the demo alive" checklist (J-NISHIT-010).
5. After judging: Resolve preview (FE-032), board on phones (FE-051), unit tests for the scheduler config (FE-080), client view transitions (FE-070).
