# Product

## Name

**Foldback.** Use this name everywhere: UI title, repository, video, and Devpost text. The working name "Quorum" is retired because it is generic.

## Pitch

**Nobody pays unless the group makes it.**

An organizer pastes the group chat where the plan was agreed. Foldback reads out the terms (who, how much, by when, and at most one person allowed to pay late), the organizer confirms them, and each friend gets a pay link. Each payment is a PayPal hold, not a charge. If everyone pays by the deadline, Foldback captures every hold. If not, it voids every hold and nobody is charged.

Thirty-second version, for the video and the Devpost opener:

"Group plans die in the group chat. Someone fronts the money, chases payments for a week, and when the plan falls through, they're stuck refunding people. Foldback reads the chat, turns the plan into confirmed terms, and sends every friend a PayPal link that holds their share instead of charging it. A Bryntum schedule shows who is held and who is still waiting. If the whole group pays by the deadline, Foldback captures every hold. If it doesn't, Foldback releases them, so nobody pays for a plan that didn't happen. An AI agent helps the organizer chase people and see what happens next, but code makes the money decision."

## Audience

One organizer collecting a small number of equal shares for a single plan that needs everyone, or it doesn't happen.

Examples the demo may use:

- A cabin weekend: four friends, $80 each, by Friday.
- A workshop or class that runs only if four deposits arrive.
- A group gift or a print run with one fixed share and a deadline.

Not the audience: marketplaces, payroll, nonprofits doing restricted accounting, merchants fighting disputes, or anyone who needs subscriptions.

## Problem

The organizer carries three costs today:

1. **Fronting risk.** They pay the deposit and hope everyone pays them back.
2. **Chasing.** They spend days sending "did you pay yet?" messages.
3. **Unwinding.** When the plan fails, they hold money they should not keep and have to send it back one person at a time.

The decision is binary and time-based: the group makes the headcount by the deadline, or nobody should be out of pocket. An authorization hold is the natural PayPal primitive for that condition.

## What the AI does

Two jobs, both with hard limits.

**Rule reader.** A language model reads one pasted chat or sentence and fills a fixed schema: title, currency, total, share, headcount, people, deadline, timezone, and at most one grace clause. Every field needs an evidence quote from the text. When a field is missing or the amounts disagree, the model asks one clarifying question, and the organizer's answer is read along with the original text. The organizer confirms the fields on screen. The server validator overrides the model whenever the model's numbers do not add up.

**Organizer agent.** A panel on the board where the organizer can ask questions in plain language. The agent has tools to:

- read the contract status
- simulate the outcome at a future time ("what happens if Maya doesn't pay?"), using the real resolve engine on a copy
- fetch a person's pay link and the facts for a reminder, which the agent writes up for the organizer to copy
- propose a demo-clock move or a resolve, which the organizer approves with one click

The agent cannot pass amounts, create orders, capture, or void. Its proposals go through the same routes and rules as the buttons. It also drives the Bryntum board: a proposed clock move shows as a dashed "Proposed" marker before the organizer approves it.

## What the code does

After confirmation, deterministic code (`services/resolve`, using the pure `domain/decide`) decides:

- **Everyone held by the deadline:** capture every hold. Contract `kept`.
- **Short by exactly the one named grace person at the deadline:** keep the other holds and let only that person pay until the grace window ends.
- **Otherwise:** void every hold. Contract `released`. Nobody is charged.

The decision is final once it is made. Code records `direction` (`keep` or `release`) and never flips it, even after a PayPal hiccup.

## Two outcomes the demo must show

**Kept.** Three friends are already held. The fourth pays live on camera. Foldback immediately captures all four holds, and the board turns every row to Kept with real capture ids.

**Released.** Three friends are held, Maya misses the deadline and her grace window, and Foldback voids the three holds. Each row shows Released and the PayPal authorization status `VOIDED`. Pressing Resolve again sends nothing.

## Demo constraints

- One organizer per plan (each organizer has an account or a guest workspace). USD only. Headcount 2, 3, or 4, with one named person per share.
- Every payer owes the same share. `total_cents` must equal `headcount * share_cents`.
- At most one grace person, with one grace deadline.
- Seeded contracts use `America/Los_Angeles`.
- The engine uses each contract's `demo_now`, not the wall clock, so a judge can move Friday to Monday without waiting.
- A contract is either entirely `sample` (seeded, no PayPal ids) or entirely `sandbox` (real PayPal calls). They are never mixed.
- PayPal authorizations are valid for up to 29 days, and capture is most reliable within the 3-day honor period. The product targets short-deadline plans. Reauthorization is out of scope, and the README says so.

## Non-goals

Do not build any of these, even if a phase finishes early:

- Shared plans with co-organizers, accounts for payers, merchant onboarding, or a public directory of plans
- Payouts, subscriptions, disputes, invoicing, refunds after capture, or reauthorization
- Card fields, Venmo as a separate flow, or multi-currency
- Unequal shares, tips, tax, coupons, or a model-picked price
- More than one grace person
- Sending email, SMS, or WhatsApp. The agent drafts text; the organizer copies it.
- A mobile app, native wrapper, or analytics product
- Any sponsor tool besides Bryntum
- "The money is safe with Foldback" copy, escrow claims, or legal advice
- Predictive models, payer ranking, or partial captures
- Editing a rule after confirmation. The organizer resets the demo or creates a new contract.

## Claims we will not make

- Foldback is not escrow, a bank, or a money transmitter. It is a sandbox prototype that places and resolves PayPal authorizations under a confirmed rule.
- A sample row is not a payment. Copy must say "Sample" unless `money_source` is `sandbox` and a PayPal id returned by PayPal is stored.
- No invented revenue, user counts, or survey numbers. If we cite a public fact (for example, that PayPal retired Money Pools in 2021), the Devpost text links the source, or we drop the claim.
- We will not claim the Bryntum trial lasts through judging until Bryntum replies yes. See `scheduler.md`.

## Organizer control

Confirmation is required before any pay link works. After confirmation, capture and void follow the rule without a second approval. That is the product: the organizer already approved the condition. The board shows the reason in one engine-written sentence, for example "3 of 4 were held when Maya Shah's grace ended, so Foldback released every hold. Nobody was charged."

Reset deletes local rows. It does not void holds that already exist in PayPal. `demo.md` tells the operator to release leftover sandbox holds before reset.

## Success criteria

Judges score five equally weighted criteria. Each one maps to something the build must show:

| Criterion | What earns it |
|---|---|
| Technological implementation | Authorize, capture, and void with idempotency and unknown-outcome handling. LLM structured outputs plus a tool-using agent with guardrails. A production-grade system: a constraint-enforced Postgres schema, auth, rate limits, observability, CI, and Docker on a real VM. |
| Design | One coherent flow: chat paste, confirm, pay links, board, outcome. A real payer page, not an organizer clicking for everyone. |
| Potential impact | The fronting, chasing, and unwinding pain, told with a concrete example. Nobody charged when a plan fails. |
| Innovation | An all-or-nothing group hold on PayPal, read from chat, run by an agent that cannot touch the money. |
| Presentation | A video under 3 minutes with one live PayPal approval, both outcomes, and readable ids. A hosted HTTPS URL with a one-click guest workspace. |

A judge who never opens the code can watch the video and see: a chat, the extracted terms, a pay link, a live PayPal hold, the agent answering "what if Maya doesn't pay?", a capture wave (Kept), and a void wave (Released).
