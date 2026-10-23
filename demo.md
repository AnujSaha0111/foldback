# Demo

This file is the source for the two rule strings, the off-camera sandbox prep, the video, and the Devpost draft. `app/shared/src/rules.ts` copies the pastes exactly, including punctuation.

## Cabin rule paste

```text
The cabin is $320. We need 4 people at $80 each by Friday 6 November 2026, 6:00pm Pacific. The people are Alex Chen, Sam Ortiz, Jordan Lee, and Maya Shah. If Maya Shah is waiting on payday, give her until Monday 9 November 2026, 6:00pm Pacific. If we are still short, refund everyone.
```

Confirmed fields the stub and the live model are expected to reach:

- Title `Cabin`
- USD 320.00 total, 80.00 share, headcount 4
- Deadline `2026-11-06T18:00:00-08:00`
- Grace Maya Shah until `2026-11-09T18:00:00-08:00`
- Timezone `America/Los_Angeles`

## Print-run rule paste

```text
The print run is $200. We need 4 people at $50 each by Friday 6 November 2026, 6:00pm Pacific. The people are Priya Nair, Noah Brooks, Elena Vaz, and Chris Dalton. If we are short, refund everyone.
```

- Title `Print run`
- USD 200.00 total, 50.00 share, headcount 4
- Deadline `2026-11-06T18:00:00-08:00`
- No grace

The phase 1 seeds use these strings but their shares are `sample`. The video does not refund sample rows.

## Off-camera prep

Do this the day of the recording, in the sandbox business account.

1. Reset demo data so the sample boards are clean. Leave them in the app for a backup shot, and do not use them as the "live" contracts.
2. Paste the cabin rule, confirm, and pay Alex, Sam, and Jordan with the sandbox personal account. Leave Maya unpaid. `demo_now` should still be before the deadline (confirm sets it two hours before).
3. Paste the print-run rule, confirm, and pay all four people with the same sandbox buyer. Then set the clock to the deadline only if you need the lock to happen on camera. Prefer leaving the clock just before the deadline and pressing Resolve on camera, or capturing the fourth person on camera if you still need the one live capture.
4. The video needs one live capture and one live refund wave. Recommended split: the print-run's fourth payment is the live capture, done on camera, and it locks the contract. The cabin's three prepared captures are refunded on camera after you advance to grace end. Do not also pay Maya in that take, or the cabin will lock and you will have nothing to refund.
5. Write down the three cabin capture ids and the print-run capture ids before you start recording, so a failed take can be explained. Do not put those ids in git.

If a prepared capture is left over after a bad take, refund it from the app by resolving a short contract, or refund that capture in the PayPal sandbox dashboard. Then prep again. Local reset will not undo PayPal.

## Storyboard

Target length 2 minutes 30 seconds. Hard stop 2 minutes 50 seconds. Judges are not required to watch past 3 minutes.

Say "Foldback" at the start. Do not say "Quorum." Do not play copyrighted music. Do not show another company's logo except the PayPal window that the checkout itself opens. That window is the product's payment step, not a bumper.

| Time | On screen | Say |
|---|---|---|
| 0:00–0:20 | Header and an empty rule box | "A group can pay before anyone knows the group is big enough. Foldback keeps every PayPal share only if the headcount is met, and refunds them if it is not." |
| 0:20–0:45 | Paste the cabin rule. Field list. Press confirm. | "The model only reads the rule. Nothing is charged until these terms are confirmed." Point at $80, four people, Friday, and Maya's Monday. |
| 0:45–1:05 | Cut to the prepared cabin board. Three Held rows, Maya Waiting. Badge on a prepared row shows Sandbox and a capture id. | "Alex, Sam, and Jordan have already paid. Maya has not. The deadline is Friday at 6." |
| 1:05–1:25 | Advance to deadline. Status pill `In grace`. Other unpaid shares are not in this contract. | "Maya was the one person the rule allowed to pay late. The others stay held. Foldback does not keep the money yet." |
| 1:25–1:55 | Advance to grace end. Three rows become `Refunded` with refund ids. Reason sentence visible. Press Resolve again and show that no new id appears. | "Monday passed and we are still at three of four, so Foldback refunds every capture. Running it again does not refund twice." |
| 1:55–2:20 | Switch to print run with three Held and one Waiting, or three captured and the fourth checkout. Complete one sandbox approval on camera. Rows turn `Kept`. | "This plan did reach four people. That payment is a real sandbox capture, and the shares are kept. A refund is refused." |
| 2:20–2:30 | Reason sentence and the scheduler, both outcomes recalled in one sentence. | "Foldback is the board and the PayPal calls for a condition the organizer already confirmed." |

If the live capture is easier at the start of the recording, swap the print-run block before the refund block. Keep both outcomes. Keep one approval inside the PayPal window in the take, and keep the refund ids readable for at least three seconds.

Sample boards may appear only if the word Sample is on screen. Do not narrate them as payments.

## Judge run

Phase 7 writes the steps into `app/README.md`. The minimum path a judge can finish without watching the prep:

1. Install, env, `npm run dev`.
2. Open the sample cabin. See Held and Waiting. Read the sample badge.
3. Open the sample print run, press Resolve, see Kept.
4. Optional: paste the cabin rule and pay one share.

The sample print-run lock is local. The README must say that, so a judge does not think those rows were charged.

## Video rules

- Public YouTube, unlisted is not enough if Devpost requires public. The hackathon rules require publicly visible.
- Under 3 minutes.
- Show the app on the desktop it was built for, at about 1280 pixels wide.
- No third-party trademarks as decoration and no copyrighted music.
- The PayPal checkout and the capture and refund ids are real sandbox calls in the take you submit.

## Devpost draft

Title: Foldback

Tagline: Keep a group PayPal payment only when the headcount is met. Refund every share when it is not.

About, short:

Foldback is a sandbox prototype for an organizer collecting equal shares toward one plan. You paste a rule in plain English. The model extracts the total, the share, the people, the deadline, and at most one grace clause. You confirm those fields. Each person pays through PayPal Checkout. Bryntum Scheduler shows who is waiting, held, in grace, kept, or refunded.

If the confirmed headcount is captured by the deadline, Foldback locks the payments. If it is not, Foldback refunds every captured share once and records the refund ids. A second run does not refund again. If PayPal's answer is lost, the share stays reserved instead of being charged or refunded twice.

The demo includes a cabin rule with a Friday deadline and a Monday grace period for one named person, and a print run that locks when the fourth payment captures.

Built with PayPal Orders v2 (create, capture, get, refund) in the sandbox, Bryntum Scheduler, and one JSON-schema model call for extraction. Amounts and the lock-or-refund decision are server code.

Tools paragraph:

- PayPal sandbox REST. The server creates the order for the confirmed share amount, captures after buyer approval, and refunds the capture when the rule fails. Idempotency keys are stable per share.
- Bryntum Scheduler. One read-only schedule, one row per person, events named for the payment state, markers for the deadline, grace end, and the demo clock.
- Model: (fill in the provider and model name in phase 7). Used only to extract the rule into a schema. It does not set prices and it does not call PayPal.

What we did not build: marketplace onboarding, payouts, subscriptions, disputes, unequal shares, or a second sponsor tool.

## Pitch backup

If the opener needs to be shorter:

"Foldback turns a group rule into PayPal payments that are kept when the headcount is met and refunded when it is not."
