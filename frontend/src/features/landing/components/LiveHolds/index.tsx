"use client";

import { useEffect, useState } from "react";
import { StatusTag } from "@/components/StatusTag";
import { formatMoment, formatMoney } from "@/lib/format";
import { SHARE_STATUS_VIEW } from "@/lib/status";
import { SAMPLE } from "../../sample";
import { Amount, Head, Root, Row, Small, Squares, Sum } from "./styled";

const FIRST_HOLD_MS = 900;
const BETWEEN_HOLDS_MS = 700;
const PAYERS = SAMPLE.people.filter((person) => person.holds).length;
const TOTAL = SAMPLE.shareCents * SAMPLE.people.length;

/** The hero panel: holds arrive one by one on load. Under reduced motion they are all in from the start. */
export function LiveHolds() {
  const [held, setHeld] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = Array.from({ length: PAYERS }, (_, index) =>
      setTimeout(() => setHeld(index + 1), reduced ? 0 : FIRST_HOLD_MS + index * BETWEEN_HOLDS_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Root role="group" aria-label={`Example: ${SAMPLE.title} plan`}>
      <Head>
        <strong>{SAMPLE.title}</strong>
        <Small>Deadline {formatMoment(SAMPLE.deadline, SAMPLE.timeZone, true)}</Small>
      </Head>
      {SAMPLE.people.map((person, index) => (
        <Row key={person.name}>
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
        <Amount>
          {formatMoney(held * SAMPLE.shareCents)} of {formatMoney(TOTAL)}
        </Amount>
      </Sum>
    </Root>
  );
}
