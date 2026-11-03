"use client";

// Install command that worked (Yarn 4, the trial alias needs an explicit range):
//   yarn add "@bryntum/scheduler@npm:@bryntum/scheduler-trial@^7.3.7" @bryntum/scheduler-react@^7.3.7
// Bryntum's stylesheets are imported here and nowhere else, so they reach only the board route.
import "@bryntum/scheduler/scheduler.css";
import "@bryntum/scheduler/svalbard-light.css";
import type { EventModel } from "@bryntum/scheduler";
import { BryntumScheduler } from "@bryntum/scheduler-react";
import type { BryntumSchedulerProps } from "@bryntum/scheduler-react";
import GlobalStyles from "@mui/material/GlobalStyles";
import { useCallback, useMemo } from "react";
import { SHARE_STATUS_VIEW } from "@/lib/status";
import type { SchedulerProjection } from "@/types/generated/api-types";
import type { ShareStatus } from "@/types/generated/statuses";
import { BRYNTUM_THEME } from "./styled";

/** Bars shorter than this keep their word beside them instead of clipped inside (docs/spec/scheduler.md). */
const SHORT_BAR_MS = 12 * 3_600_000;
const ROW_HEIGHT = 64;

// Everything handed to Bryntum that is not data lives outside the component. The wrapper re-applies any prop whose
// identity changed, so a new object on each render (a click selects a person and re-renders) reset the time axis
// and scrolled the bars out of view.
const VIEW_PRESET = {
  base: "hourAndDay",
  tickWidth: 32,
  headers: [
    { unit: "day", dateFormat: "ddd D" },
    { unit: "hour", increment: 6, dateFormat: "HH" },
  ],
};
const COLUMNS = [
  { text: "Person", field: "name", width: 180 },
  { text: "", field: "badge", width: 96 },
];
const TIME_RANGES_FEATURE = { showHeaderElements: true };
const TOOLTIP_FEATURE = {
  template: ({ eventRecord }: { eventRecord: EventModel }) => {
    const paypalId = eventRecord.get("paypalId") as string | null;
    return {
      children: [
        { tag: "strong", text: String(eventRecord.name ?? "") },
        ...(paypalId ? [{ tag: "div", text: `PayPal ${paypalId}` }] : []),
      ],
    };
  },
};

const renderEvent: NonNullable<BryntumSchedulerProps["eventRenderer"]> = ({ eventRecord, renderData }) => {
  if (typeof renderData.cls !== "string") {
    // The bar wears the status tag's look for this status (see styled.ts).
    renderData.cls.add(`fb-tone-${SHARE_STATUS_VIEW[eventRecord.get("status") as ShareStatus].tone}`);
    if (eventRecord.durationMS < SHORT_BAR_MS) renderData.cls.add("fb-short");
  }
  return String(eventRecord.name ?? "");
};

interface FoldbackSchedulerProps {
  projection: SchedulerProjection;
  onSelect: (shareId: string) => void;
  proposedAt: string | null;
}

/**
 * The organizer's board. One standard Scheduler, read only: it draws the projection and works out no status.
 * Dragging, resizing, creating and editing are all off, so selecting can never move money.
 */
export default function FoldbackScheduler({ projection, onSelect, proposedAt }: FoldbackSchedulerProps) {
  const resources = useMemo(
    () => projection.resources.map((resource) => ({ ...resource })),
    [projection.resources],
  );
  const events = useMemo(
    () =>
      projection.events.map((event) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        cls: event.cls ?? "",
      })),
    [projection.events],
  );
  // The one range the client adds: a pending proposal, until it is approved or dismissed (scheduler.md).
  const timeRanges = useMemo(() => {
    const ranges = projection.timeRanges.map((range) => ({ ...range, startDate: new Date(range.startDate) }));
    if (proposedAt)
      ranges.push({
        id: "proposed" as never,
        name: "Proposed",
        startDate: new Date(proposedAt),
        cls: "fb-proposed",
      });
    return ranges;
  }, [projection.timeRanges, proposedAt]);

  const start = useMemo(() => new Date(projection.start), [projection.start]);
  const end = useMemo(() => new Date(projection.end), [projection.end]);
  const selectEvent = useCallback<Exclude<BryntumSchedulerProps["onEventClick"], string | undefined>>(
    ({ eventRecord }) => onSelect(String(eventRecord.resourceId)),
    [onSelect],
  );
  const selectCell = useCallback<Exclude<BryntumSchedulerProps["onCellClick"], string | undefined>>(
    ({ record }) => onSelect(String(record.id)),
    [onSelect],
  );

  return (
    <>
      <GlobalStyles styles={BRYNTUM_THEME} />
      <BryntumScheduler
        resources={resources}
        events={events}
        timeRanges={timeRanges}
        startDate={start}
        endDate={end}
        timeZone={projection.timezone}
        viewPreset={VIEW_PRESET}
        fillTicks
        readOnly
        // Without this Bryntum fetches Font Awesome from a CDN at runtime. The board shows no icons.
        detectCSSCompatibilityIssues={false}
        zoomOnMouseWheel={false}
        rowHeight={ROW_HEIGHT}
        autoHeight
        columns={COLUMNS}
        eventEditFeature={false}
        eventDragFeature={false}
        eventResizeFeature={false}
        eventDragCreateFeature={false}
        timeRangesFeature={TIME_RANGES_FEATURE}
        eventTooltipFeature={TOOLTIP_FEATURE}
        eventRenderer={renderEvent}
        onEventClick={selectEvent}
        onCellClick={selectCell}
      />
    </>
  );
}
