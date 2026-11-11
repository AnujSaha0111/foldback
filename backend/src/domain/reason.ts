import { DateTime } from "luxon";

// The one sentence the board shows for a decision. Written by the engine, never by a model (ai.md).

/** "Mon 9 Nov, 6:00pm PT", in the organizer's zone: the same style the board uses. */
export function when(instant: Date, zone: string): string {
  const time = DateTime.fromJSDate(instant, { zone }).setLocale("en-US");
  // "PST" and "PDT" are both "PT" to a reader, like the board's own times.
  const name = time.toFormat("ZZZZ").replace(/^([A-Z])[SD]T$/, "$1T");
  return `${time.toFormat("ccc d LLL, h:mm")}${time.toFormat("a").toLowerCase()} ${name}`;
}

export const reasons = {
  kept: (headcount: number) => `All ${headcount} were held, so Foldback captured every share.`,

  releasedAtGraceEnd: (held: number, headcount: number, graceName: string) =>
    `${held} of ${headcount} were held when ${graceName}'s grace ended, so Foldback released every hold. Nobody was charged.`,

  releasedAtDeadline: (held: number, headcount: number) =>
    `${held} of ${headcount} were held at the deadline, so Foldback released every hold. Nobody was charged.`,

  grace: (held: number, headcount: number, graceName: string, until: Date, zone: string) =>
    `${held} of ${headcount} are held. ${graceName} has until ${when(until, zone)} to pay.`,

  unknown: (names: string[]) =>
    `A PayPal result is unknown for ${names.join(", ")}, so Foldback paused and sent nothing else.`,

  captureRefused: (name: string) =>
    `PayPal refused to capture ${name}'s share, so Foldback paused. Nothing else was sent.`,

  voidRefused: (name: string) => `PayPal refused to release ${name}'s hold, so Foldback paused.`,

  unreachable: (name: string) =>
    `Foldback got no answer it could act on from PayPal for ${name}, so it paused. Nothing was taken. Resolve again to retry.`,

  clockMoved: (to: Date, zone: string) => `The demo clock moved to ${when(to, zone)}.`,
};
