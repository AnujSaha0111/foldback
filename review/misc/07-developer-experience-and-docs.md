# Developer experience and documentation

Owner: Ravi. Sources: `README.md`, `docs/team-setup.md`, `docs/spec/demo.md` (Judge path), `backend/.env.example`, `backend/src/config/env.ts`, `backend/package.json`, `frontend/package.json`, `backend/test/helpers/{db,env}.ts`. I set up this project from scratch on a Mac on 30 October and again for this audit on 8 November; the findings below come from that.

## [MI-025] The README is a nine-line stub, and the judge guide is not written

- Category: Documentation / presentation
- Severity: High
- Status: Missing
- File: `README.md`
- Code Location: whole file (9 lines: the tagline, one paragraph, and "Work in progress for the PayPal AI Hackathon … This README becomes the judge guide in the final phase.")
- Description: Judges are not required to run the project, so the README and the video carry most of the weight. Today the README has no live link, no tour, no architecture, no PayPal flow, no AI explanation, no setup and no licence line. It also names the hackathon, which must go before the repo is public (MI-029).
- Current Implementation: The content exists, but it is spread across `docs/spec/` (long and written for the team). `demo.md` already has a five-step judge path.
- Problem: Every judge lens in `review/judges/` scores Presentation off this file. Nishit's J-NISHIT-001 asks for the same thing.
- Why It Matters: It is the highest-leverage document in the submission.
- Recommended Solution: Write the README as the judge guide, at most about two screens:
  1. One paragraph: the problem and the idea, and the live link https://app.foldback.tech.
  2. The two-minute tour (`demo.md` judge path steps 1–4), with screenshots of the board and the pay page.
  3. "How PayPal is used": a table of the four calls (create order with `intent: AUTHORIZE`, authorize, capture, void), their idempotency keys, and what happens on an unknown result.
  4. "How AI is used, and what it is not allowed to do": the rule reader with evidence quotes, the server validator, the assistant's five read-only tools, and proposals that need Approve. Link the bake-off table (AI-032).
  5. Architecture in one diagram (the one in `docs/spec/architecture.md`).
  6. Run it locally: the exact commands (see MI-026).
  7. Privacy and AI-provider note (AI-023), and that it is sandbox only.
  8. Licence: MIT.

  Remove every hackathon mention (MI-029).
- Implementation Complexity: Medium
- Breaking Change Risk: Low
- Dependencies: MI-026, MI-029, AI-023; J-NISHIT-001. Nishit or the README owner writes it; I may not edit `README.md`.
- Verification Method: A person who has never seen the project can do the tour from the README alone, and can explain the PayPal flow after reading it.

## [MI-026] Local setup has gaps: no backend dev command, and an unexplained required secret

- Category: Developer experience
- Severity: Medium
- Status: Partially Implemented
- File: `docs/team-setup.md`, `backend/package.json`, `backend/.env.example`, `docs/spec/demo.md`
- Code Location: team-setup "Run it locally" block; `demo.md` line 81 ("`yarn migrate`, `yarn dev`"); `.env.example` line 15 (`JWT_SECRET=` empty); `env.ts` line 35 (`JWT_SECRET` at least 32 characters, required)
- Description: Following the documents literally:
  - `team-setup.md` ends at `corepack yarn test`. It never says how to start the API or the web app.
  - `demo.md` says `yarn dev`, but the backend has no `dev` script (only `build` and `start`), so `yarn dev` fails in `backend/`. I hit this while helping set up on 30 October.
  - `.env.example` leaves `JWT_SECRET` empty, and the API refuses to start without 32 or more characters. The generate command is only in a comment.
  - The guide says the Docker databases use ports 5432 and 5433. On a machine where either port is taken by another project (common), `compose up` fails or, worse, connects to someone else's database (see MI-028).
- Current Implementation: Setup works once you know these steps. On this Mac it needed a local port override and a generated secret.
- Problem: A judge or open-source visitor following the README (once written) will stall at step one or two.
- Why It Matters: Jo Franchetti, Eddie Jaoude and Marco Podien's lenses all weigh ease of setup.
- Recommended Solution:
  1. Add `"dev": "tsx watch --env-file-if-exists=.env src/server.ts"` to `backend/package.json` (tsx is already a dev dependency).
  2. In `team-setup.md`, add "Start the API: `cd backend && corepack yarn dev`" and "Start the web app: `cd frontend && corepack yarn dev`, then open http://localhost:3000".
  3. In `.env.example`, either ship a clearly fake development-only 32-character value with the comment "change for production", or add the generate command as a numbered setup step.
  4. Note the port override option (`docker compose -f deploy/compose.dev.yml -f <local override>`) for machines where 5432 or 5433 is taken.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Manveer (backend scripts), the docs owners.
- Verification Method: A fresh clone on a clean machine reaches the landing page and the guest flow by following only the README.

## [MI-027] `.env.example` does not list every variable the API reads

- Category: Developer experience
- Severity: Low
- Status: Partially Implemented
- File: `backend/.env.example`, `backend/src/config/env.ts`
- Code Location: keys read in `env.ts` but absent from `.env.example`: `LLM_CHAIN`, `AGENT_PER_CONTRACT_PER_DAY`, `PAYPAL_API_BASE`, `METRICS_TOKEN`, `OTEL_EXPORTER_OTLP_ENDPOINT`
- Description: All five have defaults, so nothing breaks, but the model chain is one of the project's key settings and a reader cannot discover it from the example file.
- Current Implementation: Defaults in `env.ts` (for example `DEFAULT_LLM_CHAIN`).
- Problem: Discoverability, and `LLM_CHAIN` is exactly what a developer wants to change to run on free models only.
- Why It Matters: DX, and it supports the "free models only" story.
- Recommended Solution: Add the five keys, commented out, with their defaults and one line each, for example `# LLM_CHAIN=groq:openai/gpt-oss-120b,gemini:gemini-3.1-flash-lite   # free-only chain; the default starts with prepaid DeepSeek`.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Manveer
- Verification Method: Every key read in `env.ts` appears in `.env.example`.

## [MI-028] Integration tests wipe whatever database `TEST_DATABASE_URL` points at, with no guard

- Category: Developer experience / safety
- Severity: Medium
- Status: Missing
- File: `backend/test/helpers/db.ts`, `backend/.env.example`, `docs/team-setup.md`
- Code Location: `db.ts` line 8 (default `postgres://foldback:foldback@localhost:5433/foldback_test`); the helper drops and rebuilds the schema
- Description: On this machine on 8 November, port 5433 belonged to another project's Postgres (`orchestrai-db-1`), because the Foldback dev containers were stopped. `corepack yarn test` connected to it. It failed only because the password differed: 261 tests failed with "password authentication failed for user foldback". With the common `postgres`/`postgres` credentials, or a matching user, the suite would have dropped another project's schema.
- Current Implementation: The URL defaults to a fixed port and nothing checks what is on the other end.
- Problem: A destructive test run can hit an unrelated local database. Open-source contributors will have their own Postgres on these ports.
- Why It Matters: Data loss on a contributor's machine, and a confusing first experience (261 red tests).
- Recommended Solution: In the test database helper, before dropping anything, refuse unless the database name ends in `_test` and a marker exists. For example, the compose file's init script creates a table `foldback_test_marker`, and the helper checks for it and aborts with "TEST_DATABASE_URL does not point at the Foldback test database". Two queries; no dependency.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Manveer (test helpers, `deploy/dev-init.sql`)
- Verification Method: Point `TEST_DATABASE_URL` at a scratch Postgres without the marker; the suite stops before any DDL runs.
