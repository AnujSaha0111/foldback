"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { StatusTag } from "@/components/StatusTag";
import { formatMoment, formatMoney } from "@/lib/format";
import { CONTRACT_STATUS_VIEW, SHARE_STATUS_VIEW } from "@/lib/status";
import { SAMPLE } from "../../sample";
import { useLean } from "./useLean";
import { Amount, Caption, Head, Initials, Meter, Root, Row, Small, Squares, Sum, ToGo, Wrap } from "./styled";

const FIRST_HOLD_MS = 900;
const BETWEEN_HOLDS_MS = 700;
const PAYERS = SAMPLE.people.filter((person) => person.holds).length;
const TOTAL = SAMPLE.shareCents * SAMPLE.people.length;

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("");

/** The hero panel: holds arrive one by one on load. Under reduced motion they are all in from the start. */
export function LiveHolds() {
  const [held, setHeld] = useState(0);
  // Bumped by Replay, which plays the arrivals again from nobody held.
  const [run, setRun] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = Array.from({ length: PAYERS }, (_, index) =>
      setTimeout(() => setHeld(index + 1), reduced ? 0 : FIRST_HOLD_MS + index * BETWEEN_HOLDS_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [run]);

  const replay = () => {
    setHeld(0);
    setRun(run + 1);
  };

  const { lean, settle } = useLean(ref);

  const open = SAMPLE.people.length - held;

  return (
    <Wrap>
      <Root
        ref={ref}
        role="group"
        aria-label={`Example: ${SAMPLE.title} plan`}
        onPointerMove={lean}
        onPointerLeave={settle}
      >
        <Head>
          <strong>
            {SAMPLE.title}
            <StatusTag view={CONTRACT_STATUS_VIEW.active} />
          </strong>
          <Small>Deadline {formatMoment(SAMPLE.deadline, SAMPLE.timeZone, true)}</Small>
        </Head>
        {SAMPLE.people.map((person, index) => (
          <Row key={person.name}>
            <Initials aria-hidden="true">{initials(person.name)}</Initials>
            <span>
              {person.name} {person.note ? <Small>{person.note}</Small> : null}
            </span>
            <span>
              <StatusTag view={SHARE_STATUS_VIEW[index < held ? "held" : "waiting"]} />
            </span>
            <Amount>{formatMoney(SAMPLE.shareCents)}</Amount>
          </Row>
        ))}
        <Sum>
          <span>
            <Squares aria-hidden="true">
              {SAMPLE.people.map((person, index) => (
                <i key={person.name} data-on={index < held} />
              ))}
            </Squares>
            {held} of {SAMPLE.people.length} held
          </span>
          {held === PAYERS ? <ToGo>{open} to go</ToGo> : null}
          <Amount>
            {formatMoney(held * SAMPLE.shareCents)} of {formatMoney(TOTAL)}
          </Amount>
          <Meter aria-hidden="true" style={{ "--v": held / SAMPLE.people.length } as CSSProperties}>
            <i />
          </Meter>
        </Sum>
      </Root>
      <Caption>
        <span>Sample plan. Holds arrive as friends approve on their phones.</span>
        <button type="button" onClick={replay}>
          Replay
        </button>
      </Caption>
    </Wrap>
  );
}
