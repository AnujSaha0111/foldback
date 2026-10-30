# Demo

This file is the source of truth for the demo strings, the off-camera sandbox prep, the video, the judge path, and the Devpost draft. `backend/src/shared/rules.ts` copies the strings below character for character.

## Cabin group chat (primary demo input)

```text
[Sun 1 Nov, 11:42] Alex Chen: ok the cabin is $320 for the weekend, owner wants the money by friday
[Sun 1 Nov, 11:43] Sam Ortiz: so $80 each if it's the four of us
[Sun 1 Nov, 11:43] Jordan Lee: I'm in
[Sun 1 Nov, 11:45] Maya Shah: I'm in but I don't get paid until monday
[Sun 1 Nov, 11:46] Alex Chen: Maya you can have until monday 6pm. everyone else by friday 6pm pacific. if we don't have all 4 the trip is off and nobody pays
[Sun 1 Nov, 11:47] Sam Ortiz: works for me
```

Reference time for this fixture: `2026-11-01T12:00:00-08:00`. With it, the expected extraction is:

- Title `Cabin weekend`
- People Alex Chen, Sam Ortiz, Jordan Lee, Maya Shah. Headcount 4
- USD, total 32000, share 8000
- Deadline `2026-11-06T18:00:00-08:00`. 1 November 2026 is the day daylight time ends in the US, so Friday is PST
- Grace Maya Shah until `2026-11-09T18:00:00-08:00`
- Timezone `America/Los_Angeles`

When a judge pastes this on the hosted demo later, the server's wall-clock `reference_at` makes "friday" mean the next Friday after the paste. The flow still works; only the dates differ. The `Use the sample cabin chat` link sends the fixture's fixed `reference_at`, so the dates match the video.

## Cabin sentence (placeholder and test fixture)

```text
The cabin is $320. We need 4 people at $80 each by Friday 6 November 2026, 6:00pm Pacific. The people are Alex Chen, Sam Ortiz, Jordan Lee, and Maya Shah. If Maya Shah is waiting on payday, give her until Monday 9 November 2026, 6:00pm Pacific. If we are still short, nobody pays.
```

## Print-run sentence

```text
The print run is $200. We need 4 people at $50 each by Friday 6 November 2026, 6:00pm Pacific. The people are Priya Nair, Noah Brooks, Elena Vaz, and Chris Dalton. If we are still short, nobody pays.
```

Expected: `Print run`, 20000 / 5000 / 4, deadline `2026-11-06T18:00:00-08:00`, no grace.

## Off-camera prep (day of recording)

Use the sandbox business app and the sandbox personal buyer.

1. Reset demo data. Leave the two sample boards as backup shots.
2. **Cabin (live, for the Released outcome):** paste the cabin chat with the sample link, confirm, then open three pay links (Alex, Sam, Jordan) and hold each with the sandbox buyer. Leave Maya unpaid. `demo_now` stays two hours before the deadline.
3. **Print run (live, for the Kept outcome):** paste the print-run sentence, confirm, and hold three shares (Priya, Noah, Elena). Leave Chris for the live take.
4. Write down the authorization ids for the six holds before recording. Keep them out of git.
5. Rehearse the agent questions once so the replies are warm and short. If a reply is too long, adjust the system prompt before recording, not in post.

After a bad take: release leftover holds by resolving the contract to `released` or by voiding them in the sandbox dashboard, then prepare again. A local reset does not touch PayPal.

## Storyboard

Target 2:40. Hard stop 2:55. Judges are not required to watch past 3:00. Record at 1280 px wide. The Pay screen segment uses the browser's mobile view (375 px) so it reads as a phone.

Say "Foldback" in the first sentence. No copyrighted music. No logos other than the PayPal window that checkout itself opens.

| Time | On screen | Say |
|---|---|---|
| 0:00–0:15 | Header, empty paste box | "Group plans die in the group chat. Someone fronts the money and chases everyone. When the plan falls through, they're stuck sending refunds. Foldback fixes that: nobody pays unless the group makes it." |
| 0:15–0:40 | Paste the cabin chat. Read the plan. Field list with quotes. | "The AI reads the chat: $80 each, four people, Friday 6pm, and Maya gets until Monday. Every field is quoted from the chat, and code checks the math. Nothing happens until I confirm." Press Confirm. |
| 0:40–1:05 | Board of the prepared cabin: three Held rows, Maya Waiting, Deadline and Grace markers. Hover a tooltip that shows an authorization id. | "Alex, Sam, and Jordan opened their links and paid with PayPal. But that's a hold, a PayPal authorization, not a charge. Maya hasn't paid." |
| 1:05–1:35 | Assistant: tap "What happens if Maya doesn't pay?". The tool line shows a simulation. Then "Draft a reminder for Maya" → a draft with a pay link, Copy. | "The assistant runs the real rule as a simulation: if Maya misses Monday, all three holds are released and nobody is charged. It drafts Maya a reminder with her own pay link. It can't touch the money." |
| 1:35–2:00 | Assistant proposes "Advance to grace end". The dashed Proposed marker appears on the schedule. Approve. Rows turn Released, the reason sentence appears. Press Resolve again; nothing changes. | "I approve the agent's proposal. Monday passed, so Foldback voids every hold: Released, and nobody paid a cent. Running it again does nothing." |
| 2:00–2:35 | Print-run board, three Held. Open Chris's pay link in the phone view. Hold my share with PayPal. Log in as the sandbox buyer and approve. Back to the board: all four flip to Kept with capture ids. | "Same flow, different ending. Chris is the last one. He approves in PayPal, and because the group is now complete, Foldback captures all four holds at once. Kept." |
| 2:35–2:50 | Both boards side by side, or the reason sentences | "Foldback: one chat, one link each, and PayPal holds that are captured only if everyone makes it. Built on PayPal Orders and Authorizations, free Gemini and Groq models, and Bryntum Scheduler." |

Keep every PayPal id and the reason sentence on screen for at least three seconds. If the live approval is slow, cut the wait. Do not fake it.

## Judge path (written into the root `README.md`)

Hosted (fastest):

1. Open `https://{domain}` and press **Try it as a guest**. You get a private workspace with two sample plans for 7 days.
2. Open `Cabin weekend (Sample)`. See Held and Waiting, and read the Sample badge.
3. Ask the assistant "What happens if Maya doesn't pay?"
4. Open `Print run (Sample)`, press Resolve, and see Kept. This sample is local only; nothing is charged.
5. Optional, real PayPal: paste the sample cabin chat, confirm, open one pay link, and log in with the sandbox buyer credentials listed in the README.

Local: Docker for Postgres, `yarn install` in both packages, `.env` files, `yarn migrate`, `yarn dev`, then the same steps.

## Video rules

- Public on YouTube, under 3 minutes.
- Shows the app running at 1280 px, plus the phone view for the pay page.
- No third-party trademarks as decoration, no copyrighted music.
- The PayPal approval and the ids are real sandbox calls in the submitted take.

## Devpost draft

**Title:** Foldback

**Tagline:** Nobody pays unless the group makes it. PayPal holds for group plans, read from your group chat.

**Inspiration.** Every group trip has a person who fronts the money and spends the week chasing payments. When the plan collapses, that person sends refunds one by one. We wanted the PayPal version of "only if everyone's in."

**What it does.** Paste the group chat. A free AI model extracts the plan (price, people, deadline, and one optional late payer), quoting the chat for every field. The organizer confirms. Each friend gets a personal pay link. Paying places a PayPal authorization hold, not a charge. A Bryntum Scheduler board shows every person moving from Waiting to Held. If everyone is held by the deadline, Foldback captures every hold. If not, it voids them all and nobody is charged. An AI assistant answers "what happens if Maya doesn't pay?" by running the real rule as a simulation, drafts reminders with pay links, and proposes clock moves the organizer approves. It can't touch the money.

**How we built it.**

- PayPal Orders v2 with `intent: AUTHORIZE`, then Payments v2 capture and void. Every mutating call has a derived `PayPal-Request-Id`, so retries replay instead of double-charging. Lost responses park the share in an "unknown" state until a GET confirms what PayPal actually did.
- Free hosted models, called with plain `fetch` through a fallback chain: Gemini Flash models first, then Groq `openai/gpt-oss-120b` and `gpt-oss-20b`, then OpenRouter free. Strict JSON-schema output for the rule reader and tool calling for the assistant. A server validator re-checks the math, rejects dollar figures not found in the chat, and recomputes timezone offsets. Code, not the model, carries the money logic. Per-IP rate limits and a daily AI call cap keep the public demo inside the free quotas.
- Bryntum Scheduler: one read-only board with Deadline, Grace, Now, and agent-Proposed markers, updating live from server state.
- Production-grade stack: TypeScript strict throughout. Express 5 with routes → controllers → services → repositories. PostgreSQL 16 with a constraint-heavy schema: allowed state transitions, write-once fields, and idempotency are enforced by the database itself. Socket.IO for live board updates. JWT cookie auth with private guest workspaces. winston logs with request ids, Prometheus metrics, and health checks. Next.js 16 + MUI + Redux Toolkit. Jest suites against real Postgres, run in GitHub Actions. Multi-arch Docker images, deployed with Docker Compose and Caddy (HTTPS) on an Azure VM, with Azure Database for PostgreSQL as a separate managed service.

**Challenges.** Making money state safe under lost responses. Keeping the AI useful while making it structurally unable to move money: the agent's actions are proposals, and its simulation calls the same pure decision function as the real resolver.

**What we learned.** Authorize-then-capture is the right primitive for conditional group payments. Nobody is refunded, because nobody was charged.

**What's next.** PayPal webhooks alongside sync, reauthorization for deadlines longer than 3 days, notifications sent from the organizer's own channels, and unequal shares.

**Built with:** paypal, paypal-orders-api, gemini, groq, gpt-oss, bryntum, nextjs, react, mui, redux, typescript, express, socket.io, postgresql, docker, caddy, azure, github-actions

**Tools paragraph:**

- PayPal sandbox REST: create order (`AUTHORIZE`), authorize, capture, void, get order, get authorization.
- Google Gemini (3.x Flash and Flash-Lite) with Groq (`openai/gpt-oss-120b`, `gpt-oss-20b`) as fallback, and OpenRouter free as last resort: rule extraction with strict structured outputs, and the organizer assistant with five tools. It never sets amounts or calls PayPal.
- Bryntum Scheduler: the live board.
- Microsoft Azure (a VM, plus Azure Database for PostgreSQL Flexible Server), Docker Compose, Caddy: the hosted demo, with HTTPS.

**What we did not build:** marketplace onboarding, payouts, subscriptions, refunds, unequal shares, or messaging.

## Pitch backup

"Foldback turns a group chat into a PayPal hold for each friend, captured only if everyone pays by the deadline, and released if not."
