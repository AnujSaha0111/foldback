"use client";

// Install command that worked (Yarn 4, the trial alias needs an explicit range):
//   yarn add "@bryntum/scheduler@npm:@bryntum/scheduler-trial@^7.3.7" @bryntum/scheduler-react@^7.3.7
// Bryntum's stylesheets are imported here and nowhere else, so they reach only the board route.
import "@bryntum/scheduler/scheduler.css";
import "@bryntum/scheduler/svalbard-light.css";
import type { EventModel } from "@bryntum/scheduler";
import { BryntumScheduler } from "@bryntum/scheduler-react";
import GlobalStyles from "@mui/material/GlobalStyles";
import { useMemo } from "react";
import { SHARE_STATUS_VIEW } from "@/lib/status";
import type { SchedulerProjection } from "@/types/generated/api-types";
import type { ShareStatus } from "@/types/generated/statuses";
import { BRYNTUM_THEME } from "./styled";

/** Bars shorter than this keep their word beside them instead of clipped inside (docs/spec/scheduler.md). */
const SHORT_BAR_MS = 8 * 3_600_000;
const ROW_HEIGHT = 48;

interface FoldbackSchedulerProps {
  projection: SchedulerProjection;
  onSelect: (shareId: string) => void;
}

/**
 * The organizer's board. One standard Scheduler, read only: it draws the projection and works out no status.
 * Dragging, resizing, creating and editing are all off, so selecting can never move money.
 */
export default function FoldbackScheduler({ projection, onSelect }: FoldbackSchedulerProps) {
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
  const timeRanges = useMemo(
    () => projection.timeRanges.map((range) => ({ ...range, startDate: new Date(range.startDate) })),
    [projection.timeRanges],
  );

  return (
    <>
      <GlobalStyles styles={BRYNTUM_THEME} />
      <BryntumScheduler
        resources={resources}
        events={events}
        timeRanges={timeRanges}
        startDate={new Date(projection.start)}
        endDate={new Date(projection.end)}
        timeZone={projection.timezone}
        viewPreset={{
          base: "hourAndDay",
          tickWidth: 24,
          headers: [
            { unit: "day", dateFormat: "ddd D" },
            { unit: "hour", increment: 6, dateFormat: "HH" },
          ],
        }}
        fillTicks
        readOnly
        zoomOnMouseWheel={false}
        rowHeight={ROW_HEIGHT}
        autoHeight
        columns={[
          { text: "Person", field: "name", width: 160 },
          { text: "", field: "badge", width: 96 },
        ]}
        eventEditFeature={false}
        eventDragFeature={false}
        eventResizeFeature={false}
        eventDragCreateFeature={false}
        timeRangesFeature={{ showHeaderElements: true }}
        eventTooltipFeature={{
          template: ({ eventRecord }: { eventRecord: EventModel }) => {
            const paypalId = eventRecord.get("paypalId") as string | null;
            return {
              children: [
                { tag: "strong", text: String(eventRecord.name ?? "") },
                ...(paypalId ? [{ tag: "div", text: `PayPal ${paypalId}` }] : []),
              ],
            };
          },
        }}
        eventRenderer={({ eventRecord, renderData }) => {
          if (typeof renderData.cls !== "string") {
            // The bar wears the status tag's look for this status (see styled.ts).
            renderData.cls.add(`fb-tone-${SHARE_STATUS_VIEW[eventRecord.get("status") as ShareStatus].tone}`);
            if (eventRecord.durationMS < SHORT_BAR_MS) renderData.cls.add("fb-short");
          }
          return String(eventRecord.name ?? "");
        }}
        onEventClick={({ eventRecord }) => onSelect(String(eventRecord.resourceId))}
        onCellClick={({ record }) => onSelect(String(record.id))}
      />
    </>
  );
}
