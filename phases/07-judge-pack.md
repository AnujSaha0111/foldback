# Phase 7 — Judge pack

Budget: 5 hours. Owners: Product and UI. Depends on phase 6.

## Read

- `demo.md`
- `product.md` claims we will not make
- `scheduler.md` license section
- `test.md` whole file, to confirm nothing promised is still red

## Goal

A judge can run the app from `app/README.md` or can understand the video if they do not. The repository for submission is public, MIT, and does not contain secrets or Bryntum source.

This phase is a freeze. The work is documentation, seed prep, a rehearsal, and bugfixes for failures against `test.md` and `demo.md`. It is not a feature phase.

## Do not

- Do not add routes, tables, screens, sponsor tools, or animations that the spec does not already name.
- Do not invent customer metrics.
- Do not put `.env`, capture tokens, or `node_modules` in git.
- Do not replace the live PayPal window in the video with a mock and call it live.

## Create or finish

```text
app/README.md
app/LICENSE
```

`app/LICENSE` is the MIT license with the team members as the copyright holders and the year 2026. If the names are not known, use `Foldback contributors`.

`app/README.md` must include, in this order:

1. What Foldback does, in the one-sentence pitch from the spec README.
2. PayPal sandbox and Bryntum Scheduler, and the model provider actually used.
3. Node 20 install, `npm install`, copy `.env.example` to `.env`, and where to get sandbox credentials.
4. The Bryntum trial install command from phase 0, plus the license-email outcome from `plan.md`. If the trial may expire before 15 December 2026, say that the video is the judging artifact and a fresh trial install is the run path.
5. `npm run dev`, the local URL, and `npm test`.
6. How to open the sample cabin and print-run boards.
7. How to paste the cabin rule, confirm, and pay one share with the sandbox personal account.
8. How to advance the clock to grace end on a contract that has real captures.
9. The reset warning: local reset does not refund PayPal.
10. A statement that there is no login and the build is a sandbox demo.

Rehearse the storyboard in `demo.md` once on a clean reset plus the prepared sandbox contracts. Fix only defects that make a step in that storyboard fail.

Write the Devpost draft into the bottom of `demo.md` if it is not already filled. Do not create a separate marketing site.

## Exit check

- `npm test` passes every case in `test.md`.
- A person who was not in the last coding session can follow `app/README.md` through one capture or, if sandbox credentials are exhausted, through the sample board and a mocked test log. Record which path.
- `git status` shows no `.env` and no `node_modules`.
- Video checklist in `demo.md` is ready to shoot. Shooting can happen after this phase; the checklist must be accurate to the build.
- Feature list in the Devpost draft matches the running app. If something in `demo.md` does not exist, delete it from the draft rather than building it.

## Exit note

Rehearsal path:

MIT file:

Secrets check:
