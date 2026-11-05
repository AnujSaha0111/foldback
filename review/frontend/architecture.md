# Frontend: component architecture and code quality

Scope: `frontend/src/components/`, `frontend/src/features/`, `frontend/src/lib/`, `frontend/src/theme/`. Method: read every feature folder and shared component, grep for duplicated values and patterns, run `knip` (unused code) and `jscpd` (duplication).

Overall: the structure is clean and consistent. Shared components hold their styles in `styled.ts` beside them; features own their screens; one API client (`api/baseApi.ts`) with `injectEndpoints`; status words and looks live in one map (`lib/status.ts`); generated API types are the only source of shapes. `knip` and `jscpd` report nothing. ESLint enforces complexity 12, 80-line functions and 400-line files.

## [FE-001] Shared structure and conventions hold across the app

- Category: Architecture
- Severity: Informational
- Status: Implemented
- File: `frontend/src/components/*`, `frontend/src/features/*`
- Code Location: whole tree
- Description: Components follow one pattern (`index.tsx` + `styled.ts`), money and status text come from shared maps, and no component calls `fetch` directly.
- Current Implementation: verified by reading every feature folder and by `knip` / `jscpd` passing with zero findings.
- Problem: none.
- Why It Matters: reviewers (and judges reading the code) find the same shape everywhere.
- Recommended Solution: keep it; new UI goes through the same folders.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: `yarn knip`, `yarn dup`, reading the tree.

## [FE-002] Draft statuses were defined inside the plans list

- Category: Code quality, reuse
- Severity: Low
- Status: Implemented (fixed on `review-nishit`)
- File: `frontend/src/lib/status.ts`, `frontend/src/features/rules/components/PlansList/index.tsx`
- Code Location: `DRAFT_STATUSES`
- Description: The set of statuses that are not yet a plan (`extracting`, `needs_clarification`, `awaiting_confirmation`) was private to `PlansList`. The command menu needed the same rule.
- Current Implementation: moved to `lib/status.ts` beside the other status rules; both callers import it.
- Problem: a second copy would drift.
- Why It Matters: an unconfirmed reading must never appear as an openable plan anywhere.
- Recommended Solution: done.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: `PlansList` and `Palette` tests.

## [FE-003] The loading shimmer existed only inside the rule reader

- Category: Reuse
- Severity: Low
- Status: Implemented (fixed on `review-nishit`)
- File: `frontend/src/components/Skeleton/styled.ts`
- Code Location: `SHIMMER`, `Bone`, `Stack`
- Description: The rule reader had its own shimmer; the other screens used a spinner.
- Current Implementation: one shared `Skeleton` component; the rule reader reuses its `SHIMMER`.
- Problem: copying the shimmer per screen would duplicate it four times.
- Why It Matters: one look and one reduced-motion behaviour for every loading state.
- Recommended Solution: done.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: `Skeleton` test, browser check on `/pay` and `/plans`.

## [FE-004] A bordered card sits inside a bordered card in the assistant

- Category: Visual consistency
- Severity: Low
- Status: Missing
- File: `frontend/src/features/assistant/components/AssistantCard/styled.ts`
- Code Location: `Root` (border, `--r-panel`, 16 px padding) and `Card` (border, `--r-panel`)
- Description: Reminder drafts and proposals are 8 px bordered cards inside the 8 px bordered assistant panel.
- Current Implementation: both use `var(--r-panel)` with 16 px between them.
- Problem: same radius at two nesting levels with padding between reads slightly off (outer radius should be inner + padding), and a card-in-card adds a frame the content does not need.
- Why It Matters: small polish on the screen judges see most in the video.
- Recommended Solution: give `Card` a left rule or a `--layer` background with no border (keeps the grouping, drops the frame), or square it (`borderRadius: 0`) to match the controls.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: a design call by Nishit; not changed in this audit because it is visual taste, not a defect.
- Verification Method: look at a reply with a draft and a proposal on the board.

## [FE-005] One inline style in the board's numbers

- Category: Code quality
- Severity: Low
- Status: Missing
- File: `frontend/src/features/board/components/Board/index.tsx`
- Code Location: `Numbers`, the `<small style={{ fontWeight: 400, color: "var(--text-2)" }}>` after the held amount
- Description: Everything else is styled through `styled.ts`; this one element uses an inline style object.
- Current Implementation: inline style.
- Problem: breaks the convention; the value cannot be themed or found with the rest.
- Why It Matters: consistency only.
- Recommended Solution: add a `Of` styled `small` in `Board/styled.ts`, or a `& > div small` rule in `Stat`.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: visual check of the board's "Held so far" number.

## [FE-006] Shared touch-target size had no single source

- Category: Reuse
- Severity: Low
- Status: Implemented (fixed on `review-nishit`)
- File: `frontend/src/theme/media.ts`
- Code Location: `COARSE`, `TOUCH_TARGET`
- Description: The 44 px target was repeated as `2.75rem` in several places, with no touch-specific rule.
- Current Implementation: one media key and one size, used by buttons, pickers, the assistant input, the theme toggle and the board's link buttons.
- Problem: none left.
- Why It Matters: one change point for touch sizing.
- Recommended Solution: done.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: none
- Verification Method: browser at 375 px with touch emulation (controls measure 44 px).
