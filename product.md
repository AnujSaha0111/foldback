# Product

## Name

**Foldback.**

The working idea was previously called Quorum. That word is generic and easy for another hackathon entry to use. The idea is unchanged: a confirmed headcount and a deadline decide whether captured PayPal shares are kept or refunded. The public name is Foldback everywhere: UI title, repository, video, and Devpost text.

## Pitch

An organizer says who has to pay, how much, and by when. Foldback confirms those terms, takes each share through PayPal, and then either locks the money or refunds it.

Thirty-second version, for the video and the Devpost opener:

"A group can pay for something before anyone knows if the group is big enough. The organizer is left holding partial payments and a deadline. Foldback turns the condition into confirmed terms, shows every share on a Bryntum schedule, and keeps the PayPal payments only if the headcount is met. If it is not, the agent refunds every captured share and shows the refund ids."

## Audience

One organizer collecting a small number of equal PayPal shares for a single plan.

Examples the demo is allowed to use:

- A club cabin where four people must each pay $80 by Friday.
- A workshop that runs only if four deposits arrive.
- A print run or group gift with one fixed share and a deadline.

Not the audience: marketplaces, employers running payroll, nonprofits doing restricted accounting, merchants fighting disputes, or anyone who needs subscriptions.

## Problem

Partial payments and a failed plan leave the organizer with money they should not keep and a pile of messages about who is still in. A date-specific waitlist does not solve this. The decision is binary and time-based: the headcount is met by the deadline, or the captured shares go back.

## What the agent does

The model reads one rule and fills a fixed schema: title, currency, total, share, headcount, deadline, timezone, and at most one grace clause. It asks a question when a required field is missing or the amounts disagree. A person confirms the fields on screen.

After confirmation, deterministic code watches the demo clock and the captured shares.

- Enough captured shares by the deadline: lock the contract. Refunds are refused.
- Not enough, and no grace slot can still save it: refund every captured share once.
- Short by exactly the one named grace person, inside that person's grace window: leave the other captures held and allow only that person to pay. When the grace window ends, lock if the headcount is met, otherwise refund everyone once.

The model does not choose amounts, create orders, capture, lock, or refund.

## Two outcomes the demo must show

**Lock.** Four shares are captured before the deadline. The board turns those rows to Kept. A later refund call is rejected.

**Fold back.** Three shares are captured, the fourth person misses the deadline and the grace window, and PayPal refunds the three captures. Each row shows a real refund id. Repeating the refund does not create a second refund.

The video uses both outcomes on two different contracts. Details and timing are in `demo.md`.

## Demo constraints

- One organizer.
- Currency is USD only.
- Headcount is 2, 3, or 4.
- Every payer owes the same share. `total_cents` must equal `headcount * share_cents`.
- At most one grace person, with one grace deadline.
- Timezone for the seeded contracts is `America/Los_Angeles`.
- The engine uses each contract's `demo_now`, not the wall clock, so a judge can move Friday to Monday without waiting.
- Seeded `sample` rows have no PayPal ids. Rows that went through sandbox checkout are `sandbox` and can be refunded.
- The video contains one live buyer approval and capture, and one live refund wave on a contract whose captures were prepared in sandbox. Sample rows stay labeled sample.

## Non-goals

Do not build any of these, even if a phase finishes early:

- A second organizer, merchant onboarding, or a public directory of contracts
- PayPal Payouts, subscriptions, disputes, invoicing, or partner referrals
- Card fields, Venmo as a separate flow, or multi-currency
- Unequal shares, tips, tax, coupons, or a model-picked price
- More than one grace person, or a grace window for someone who was not named in the confirmed rule
- Email, SMS, WhatsApp, calendar sync, or accounts for the payers beyond the PayPal checkout
- A mobile app, native wrapper, or admin analytics product
- AG Grid, Render, Channel3, APIMatic, Elastic, Kernel, Astropods, Postman, or Zapier
- Automatic legal advice, escrow licensing claims, or "the money is safe with Foldback" copy
- Predictive models, ranking people by willingness to pay, or partial refunds of a share
- Editing a rule after confirmation. The organizer resets the demo or creates a new contract.

## Claims we will not make

- Foldback is not escrow, a bank, or a money transmitter. It is a sandbox prototype that creates and refunds PayPal orders under a confirmed rule.
- A sample row is not a payment. Copy must say "Sample" unless `money_source` is `sandbox` and a capture id returned by PayPal is stored.
- We will not claim a measured revenue number, a customer count, or a percentage of failed plans recovered unless `demo.md` is updated with a real count from an organizer conversation. None exists yet.
- We will not claim the Bryntum trial lasts through judging. Phase 0 sends the license email and records the answer. Until that answer is yes, the judge path is the video plus a fresh trial install documented in `app/README.md`.

## Organizer control

Confirmation is required before any checkout. After confirmation, lock and refund follow the rule without a second approval. That is the product: the organizer already approved the condition, and the agent carries it out. The board shows the reason in a sentence next to the status, for example "3 of 4 captured at the deadline, Maya's grace ended, so every capture was refunded."

The organizer can reset demo data. Reset deletes local rows. It does not void money already captured in PayPal. `demo.md` tells the operator to refund leftover sandbox captures before reset if they need a clean merchant account.

## Success for the hackathon

A judge who does not read the code can watch the video and see a rule, a schedule, a real capture, a lock, and a real refund. A judge who runs the app can follow `app/README.md` and reach the same two outcomes in sandbox.
