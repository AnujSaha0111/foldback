# Phase 9 — Ship and judge pack

Budget: 13 hours. Hats: Product and Ops. Depends on phase 8. Dates: 9–11 November 2026. Submit by the evening of 11 November (Pacific). Hard deadline: 12 November, 12:00 PT.

## Read

`demo.md`, `product.md` (Claims we will not make, Success for the hackathon), `deploy.md` (Operations), `scheduler.md` (License gate), and `test.md`.

## Goal

A judge can click the HTTPS URL and use the app, run it locally from the README, or understand everything from the video alone. The repo is public, MIT-licensed, CI is green, and it contains no secrets and no Bryntum source.

This phase is a freeze. The work is hardening, docs, rehearsal, video, and Devpost. Fix only defects that break the storyboard or a test.

## 1. Hardening pass (about 3h)

- Run the manual negatives in `test.md` on production, including the `curl` flood test, which must hit 429.
- `yarn npm audit` in both packages. Fix highs, and document anything accepted.
- Confirm helmet headers and HSTS with `curl -I`. Confirm `/metrics` is not public.
- Check the logs for leaked secrets: `docker compose logs backend | grep -i -E "secret|password|bearer"` must return nothing sensitive.
- Run `backup.sh`, then restore into a scratch database once.
- Confirm the Groq and OpenRouter keys are dedicated to this project, and that `IP_HASH_SALT`, `JWT_SECRET`, and `METRICS_TOKEN` are random.

## 2. Files (about 2h)

```text
LICENSE         MIT, "Copyright (c) 2026 Foldback contributors" (or the team names)
README.md       the judge guide (replaces the placeholder)
```

README sections, in this order:

1. The pitch, the CI badge, the live URL, a board screenshot, and the video link.
2. **Try it:** "Try it as a guest", the sandbox buyer login for the PayPal window (test-only credentials), and the judge path from `demo.md`.
3. How it works: a diagram, plus the guardrails (the model never sets amounts, the agent only proposes, decisions are final, idempotency, unknown outcomes).
4. Architecture: the stack table, the layering, the Postgres constraints, observability, and the deploy diagram. Link to `docs/spec/`.
5. Run locally: Node 24, Yarn, Docker for Postgres, the Bryntum install, the `.env` files, `yarn migrate`, `yarn dev`, and `yarn test`.
6. Bryntum license note.
7. Limits: sandbox only, AI rate limits and the daily budget, guest data expires in 7 days, holds are best captured within 3 days.

## 3. Rehearsal and video (about 6h)

- Do the prep from `demo.md` on production. Rehearse the storyboard twice.
- Record, trim to under 2:55, and add plain captions for the PayPal ids. Upload to YouTube as **Public**.

## 4. Devpost (about 2h)

- Paste the draft from `demo.md`, updated to match the running app. Delete anything that doesn't exist.
- Add the live URL, GitHub URL, and YouTube URL, plus the Built with tags and the tools paragraph.
- Opt in to Best Use of Bryntum.
- **Submit**, not just save as a draft.

## Do not

- Add routes, tables, screens, or sponsor tools.
- Invent metrics.
- Commit `.env` files, tokens, `node_modules`, or `learn/`.
- Replace the live PayPal window with a mock and call it live.

## Exit check

- [ ] All tests and every `quality.md` gate are green in CI on the submitted commit. `jscpd` and `knip` reports are clean. Lighthouse scores are recorded in the README.
- [ ] The live URL works from a fresh browser profile and a phone.
- [ ] `git log` contains no AI attribution trailers. The license is shown in GitHub's About panel.
- [ ] The video is public, under 3 minutes, and shows both outcomes with readable ids.
- [ ] Devpost is submitted before 12 November, 12:00 PT.
- [ ] `learn/11-ship.md` is written.

## Exit note

Live URL:

Video URL:

Submitted at:
