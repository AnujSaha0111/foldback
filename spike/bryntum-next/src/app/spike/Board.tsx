"use client";

// Install command that worked (Yarn 4, trial alias needs an explicit range):
//   yarn add "@bryntum/scheduler@npm:@bryntum/scheduler-trial@^7.3.7" @bryntum/scheduler-react@^7.3.7
import "@bryntum/scheduler/scheduler.css";
import "@bryntum/scheduler/svalbard-light.css";
import "@bryntum/scheduler/fontawesome/css/fontawesome.css";
import "@bryntum/scheduler/fontawesome/css/solid.css";
import { BryntumScheduler } from "@bryntum/scheduler-react";

const RESOURCES = [{ id: "shr_spike", name: "Alex Chen" }];
const EVENTS = [
  {
    id: "shr_spike:state",
    resourceId: "shr_spike",
    name: "Held",
    startDate: new Date("2026-11-06T16:00:00-08:00"),
    endDate: new Date("2026-11-06T18:00:00-08:00"),
    eventColor: "orange",
  },
];

export default function Board() {
  return (
    <BryntumScheduler
      resources={RESOURCES}
      events={EVENTS}
      startDate={new Date("2026-11-06T08:00:00-08:00")}
      endDate={new Date("2026-11-07T08:00:00-08:00")}
      viewPreset="hourAndDay"
      readOnly
      rowHeight={56}
      columns={[{ text: "Person", field: "name", width: 160 }]}
      eventRenderer={({ eventRecord }) => String(eventRecord.name ?? "")}
      height={220}
    />
  );
}
