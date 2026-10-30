"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { StatusTag } from "@/components/StatusTag";
import { formatMoment, formatMoney } from "@/lib/format";
import { SHARE_STATUS_VIEW } from "@/lib/status";
import { SAMPLE } from "../../sample";
import { Amount, Head, Initials, Meter, Root, Row, Small, Squares, Sum, ToGo } from "./styled";

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = Array.from({ length: PAYERS }, (_, index) =>
      setTimeout(() => setHeld(index + 1), reduced ? 0 : FIRST_HOLD_MS + index * BETWEEN_HOLDS_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // The panel leans toward a mouse (never on touch, never under reduced motion).
  const lean = (event: PointerEvent<HTMLDivElement>) => {
    const panel = ref.current;
    if (!panel || event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = panel.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    panel.dataset.tracking = "true";
    panel.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    panel.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    panel.style.setProperty("--ry", `${((x - 0.5) * 8).toFixed(2)}deg`);
    panel.style.setProperty("--rx", `${((0.5 - y) * 6).toFixed(2)}deg`);
  };
  const settle = () => {
    const panel = ref.current;
    if (!panel) return;
    panel.dataset.tracking = "false";
    panel.style.setProperty("--rx", "0deg");
    panel.style.setProperty("--ry", "0deg");
  };

  const open = SAMPLE.people.length - held;

  return (
    <Root
      ref={ref}
      role="group"
      aria-label={`Example: ${SAMPLE.title} plan`}
      onPointerMove={lean}
      onPointerLeave={settle}
    >
      <Head>
        <strong>{SAMPLE.title}</strong>
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
  );
}
