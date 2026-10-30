"use client";

import type { KeyboardEvent } from "react";
import { Avatar } from "@/components/Avatar";
import { SHARE_STATUS_VIEW } from "@/lib/status";
import type { ApiContract, ApiShare } from "@/types/generated/api-types";
import { buildTimeline } from "../../timeline";
import {
  Bar,
  Caption,
  Foot,
  Frame,
  Grid,
  HeadCell,
  Legend,
  Marker,
  Person,
  Row,
  Scroll,
  Track,
} from "./styled";

interface ScheduleProps {
  contract: ApiContract;
  shares: ApiShare[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Rows are people across the days of the plan. Every bar carries its status word. Select a person to see their hold. */
export function Schedule({ contract, shares, selectedId, onSelect }: ScheduleProps) {
  const timeZone = contract.timezone ?? "UTC";
  const deadline = contract.deadline_at ?? new Date().toISOString();
  const now = contract.demo_now ?? deadline;
  const timeline = buildTimeline({ timeZone, now, deadline, graceUntil: contract.grace_until });
  const cols = timeline.days.length;
  const select = (id: string) => (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(id);
  };

  return (
    <Frame>
      <Scroll>
        <Grid $cols={cols} role="grid" aria-label="People across the days of the plan">
          <HeadCell role="columnheader">Person</HeadCell>
          {timeline.days.map((day) => (
            <HeadCell key={day.label} role="columnheader" data-today={day.isToday}>
              {day.label}
            </HeadCell>
          ))}
          {shares.map((share, index) => {
            const view = SHARE_STATUS_VIEW[share.status];
            const end = share.is_grace_subject && contract.grace_until ? contract.grace_until : deadline;
            return (
              <Row
                key={share.id}
                role="row"
                tabIndex={0}
                aria-selected={share.id === selectedId}
                onClick={() => onSelect(share.id)}
                onKeyDown={select(share.id)}
              >
                <Person role="rowheader">
                  <Avatar name={share.display_name} />
                  {share.display_name}
                </Person>
                <Track $cols={cols}>
                  <Bar
                    $tone={view.tone}
                    $left={0.01}
                    $width={timeline.at(end) - 0.01}
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    {view.label}
                  </Bar>
                </Track>
              </Row>
            );
          })}
          <Foot aria-hidden="true" />
          <Marker $kind="now" $at={timeline.at(now)}>
            <span>Now</span>
          </Marker>
          <Marker $kind="deadline" $at={timeline.at(deadline)}>
            <span>Deadline</span>
          </Marker>
          {contract.grace_until ? (
            <Marker $kind="grace" $at={timeline.at(contract.grace_until)}>
              <span>Grace ends</span>
            </Marker>
          ) : null}
        </Grid>
      </Scroll>
      <Caption>
        <span>Rows are people. Every bar carries its status word. Select a person to see their hold.</span>
        <Legend aria-hidden="true">
          <span data-kind="now">Now</span>
          <span data-kind="deadline">Deadline</span>
          <span data-kind="grace">Grace</span>
        </Legend>
      </Caption>
    </Frame>
  );
}
