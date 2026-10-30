import { DateTime } from "luxon";
import type { ContractStatus, ShareStatus } from "../shared/statuses";
import type {
  SchedulerColor,
  SchedulerEvent,
  SchedulerProjection,
  SchedulerResource,
  SchedulerTimeRange,
} from "../shared/api-types";
import { isoInZone } from "./time";

const HOUR_MS = 3_600_000;

/** What the projection needs of a contract and its people. Plain values, so it can be tested without a database. */
export interface ProjectionInput {
  timezone: string;
  status: ContractStatus;
  deadlineAt: Date;
  graceUntil: Date | null;
  demoNow: Date | null;
  shares: {
    id: string;
    displayName: string;
    isGraceSubject: boolean;
    status: ShareStatus;
    moneySource: "sample" | "sandbox";
    authorizationId: string | null;
    captureId: string | null;
  }[];
}

interface Look {
  name: string;
  color: SchedulerColor;
}

const LOOK: Record<ShareStatus, Look> = {
  waiting: { name: "Waiting", color: "gray" },
  checkout_open: { name: "Paying…", color: "gray" },
  declined: { name: "Checkout closed", color: "gray" },
  authorize_unknown: { name: "Hold unknown", color: "red" },
  held: { name: "Held", color: "blue" },
  capture_unknown: { name: "Capture unknown", color: "red" },
  kept: { name: "Kept", color: "green" },
  capture_failed: { name: "Capture refused", color: "red" },
  void_unknown: { name: "Release unknown", color: "red" },
  released: { name: "Released", color: "gray" },
  expired: { name: "Missed deadline", color: "gray" },
};

/** The window: the deadline's day at 08:00, to two days after the last thing that can happen, at 20:00. */
function windowOf(input: ProjectionInput): { start: DateTime; end: DateTime } {
  const zone = input.timezone;
  const start = DateTime.fromJSDate(input.deadlineAt, { zone }).set({
    hour: 8,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  const last = DateTime.fromJSDate(input.graceUntil ?? input.deadlineAt, { zone });
  const end = last.plus({ days: 2 }).set({ hour: 20, minute: 0, second: 0, millisecond: 0 });
  return { start, end };
}

/** Where a bar starts and ends, in milliseconds, before it is clamped to the window (docs/spec/scheduler.md, Event spans). */
function spanOf(
  input: ProjectionInput,
  share: ProjectionInput["shares"][number],
  bounds: { start: number; end: number },
): [number, number] {
  const deadline = input.deadlineAt.getTime();
  const grace = (input.graceUntil ?? input.deadlineAt).getTime();
  const inGrace = input.status === "grace";
  const open = share.isGraceSubject && inGrace ? grace : deadline;
  const spans: Record<ShareStatus, [number, number]> = {
    waiting: [bounds.start, open],
    checkout_open: [bounds.start, open],
    declined: [bounds.start, open],
    authorize_unknown: [deadline - 2 * HOUR_MS, deadline + 2 * HOUR_MS],
    held: [bounds.start, inGrace ? grace : deadline],
    capture_unknown: [deadline, deadline + 6 * HOUR_MS],
    kept: [deadline - HOUR_MS, bounds.end],
    capture_failed: [deadline, bounds.end],
    void_unknown: [grace, grace + 6 * HOUR_MS],
    released: [grace, bounds.end],
    expired: [deadline, deadline + 4 * HOUR_MS],
  };
  return spans[share.status];
}

function eventOf(
  input: ProjectionInput,
  share: ProjectionInput["shares"][number],
  bounds: { start: number; end: number },
): SchedulerEvent {
  const [from, to] = spanOf(input, share, bounds);
  const clamp = (ms: number) => Math.min(bounds.end, Math.max(bounds.start, ms));
  const at = (ms: number) => isoInZone(new Date(clamp(ms)), input.timezone);
  const look = LOOK[share.status];
  return {
    id: `${share.id}:state`,
    resourceId: share.id,
    name: look.name,
    status: share.status,
    startDate: at(from),
    endDate: at(to),
    eventColor: look.color,
    cls: share.status === "released" ? "fb-released" : null,
    moneySource: share.moneySource,
    paypalId: share.moneySource === "sandbox" ? (share.captureId ?? share.authorizationId) : null,
  };
}

function timeRangesOf(input: ProjectionInput): SchedulerTimeRange[] {
  const at = (date: Date) => isoInZone(date, input.timezone);
  const ranges: SchedulerTimeRange[] = [
    { id: "deadline", name: "Deadline", startDate: at(input.deadlineAt), cls: "fb-deadline" },
  ];
  if (input.graceUntil) {
    ranges.push({ id: "grace", name: "Grace ends", startDate: at(input.graceUntil), cls: "fb-grace" });
  }
  if (input.demoNow) ranges.push({ id: "now", name: "Now", startDate: at(input.demoNow), cls: "fb-now" });
  return ranges;
}

/** The board's whole picture of a contract. Status comes from the shares; nothing here decides money. */
export function projectScheduler(input: ProjectionInput): SchedulerProjection {
  const { start, end } = windowOf(input);
  const bounds = { start: start.toMillis(), end: end.toMillis() };
  const resources: SchedulerResource[] = input.shares.map((share) => ({
    id: share.id,
    name: share.displayName,
    badge: share.moneySource === "sample" ? "Sample" : "Sandbox",
  }));
  return {
    timezone: input.timezone,
    start: isoInZone(start.toJSDate(), input.timezone),
    end: isoInZone(end.toJSDate(), input.timezone),
    resources,
    events: input.shares.map((share) => eventOf(input, share, bounds)),
    timeRanges: timeRangesOf(input),
  };
}
