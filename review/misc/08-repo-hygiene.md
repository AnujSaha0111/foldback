# Repository hygiene before going public

Owner: Ravi. The repo is private now and becomes public on 11 November, renamed, with every hackathon mention removed. Checked on `main` at `196f4f9`.

## [MI-029] Hackathon mentions to remove, and the rename's knock-on changes

- Category: Repo hygiene
- Severity: Medium
- Status: Partially Implemented
- File: see the list
- Code Location: `git grep -n -i hackathon -- ':!review'` on 8 November (17 lines in 12 files), plus binary and generated content
- Description: Mentions found:
  - `README.md` line 7 (also MI-025).
  - `docs/spec/README.md` (4), `docs/spec/deploy.md` (2), `docs/spec/phases/00-spike.md` (2, including the Bryntum licence email), `docs/spec/phases/03-backend-foundation.md` (a CI run URL with the repo name), `docs/spec/phases/09-ship.md`, `docs/spec/product.md` ("Success for the hackathon"), `docs/spec/scheduler.md` (2), `docs/team-setup.md` (`cd PayPal-Hackathon`).
  - `docs/design/landing.html` line 168 (old mockup footer: "Built for the PayPal AI hackathon").
  - `docs/design/foldback-redesign.zip`: its `screens/screen1-landing.html` footer has the same sentence, and `git grep` does not search inside ZIP files. (I added this file on 30 October.)
  - Image name `ghcr.io/anujsaha0111/paypal-hackathon/backend` in `deploy/compose.yml` line 7 and `deploy/scripts/deploy.sh` line 15. After the GitHub rename, GHCR keeps the old package name unless the package is re-published, so production must keep working through the switch.
  - The `review/` folder itself (this audit) mentions the hackathon throughout.
  - Git history: commit messages and old file versions keep every mention unless history is rewritten.
- Current Implementation: The live site is clean (no mention in the landing HTML).
- Problem: Searching for "PayPal hackathon" will still find the repo through any of these.
- Why It Matters: The team's stated goal is that the repo stays hard to find by that phrase until judging.
- Recommended Solution: One branch on 10 November:
  1. Edit the text files (spec owners and README owner).
  2. Delete `docs/design/landing.html` and the old mockups if they are superseded, and rebuild `foldback-redesign.zip` without the footer sentence (I can regenerate it on request).
  3. Decide whether `review/` ships publicly; if it does, replace the event's name with "the event".
  4. Rename the image only in a planned deploy window, with Manveer: publish the new name, update `BACKEND_IMAGE` on the Mac, then change the files.
  5. Accept that history keeps old mentions, or rewrite it (destructive, needs everyone's agreement, and breaks open clones). I recommend accepting it: commit messages are rarely indexed.
- Implementation Complexity: Medium
- Breaking Change Risk: Medium (the image rename touches production deploys)
- Dependencies: Manveer (deploy), Nishit (README and `review/README.md`), spec owners.
- Verification Method: `git grep -n -i hackathon` returns nothing outside an agreed allow-list; `unzip -p docs/design/foldback-redesign.zip | grep -ci hackathon` returns 0.

## [MI-030] No secrets in the repository or its history

- Category: Secrets
- Severity: Informational
- Status: Implemented
- File: whole history; `.github/workflows/` (gitleaks job)
- Code Location: CI step "gitleaks (whole history)" runs `gitleaks git --redact --exit-code 1 .` with a checksum-verified binary
- Description: I scanned the full history of all fetched refs (112 commits) for common secret patterns: Google `AIza…`, Groq `gsk_…`, OpenAI-style `sk-…`, OpenRouter `sk-or-v1-…`, GitHub tokens, Slack tokens, PEM private keys, PayPal access tokens (`A21AA…`), and `CLIENT_SECRET=`, `JWT_SECRET=`, `API_KEY=`, `TUNNEL_TOKEN=` with real values. No match. No `.env` file (other than `.env.example` templates) was ever committed. The CI job scans the whole history on every push.
- Current Implementation: As described. gitleaks itself was not run locally (not installed, no install approval); my scan is a regular-expression check, weaker than gitleaks' rule set, so the CI job is the authority.
- Problem: None found.
- Why It Matters: Required before the repo goes public.
- Recommended Solution: Before flipping to public, confirm the latest CI "security" job passed on `main`, and rotate the AI and PayPal sandbox keys after judging anyway (`ai.md` already says so).
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: CI security job green on the commit that goes public.

## [MI-031] Licence

- Category: Legal
- Severity: Informational
- Status: Implemented
- File: `LICENSE`
- Code Location: whole file (MIT, 21 lines)
- Description: An MIT licence is present at the root, as the hackathon's Stage One requires an open-source licence.
- Current Implementation: Present.
- Problem: The README does not mention it yet (MI-025). Bundled third-party assets need their own licence check: the Bryntum Scheduler is commercial software used under a trial (see `docs/spec/scheduler.md`), not MIT.
- Why It Matters: Stage One check, and clarity for anyone reusing the code.
- Recommended Solution: Add one README line: "Code: MIT. The board uses Bryntum Scheduler under its own licence (trial); it is not covered by the MIT licence."
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: MI-025
- Verification Method: README and LICENSE agree.
