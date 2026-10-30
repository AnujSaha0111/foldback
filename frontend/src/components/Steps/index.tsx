import type { ReactNode } from "react";
import { Body, Extra, Item, Mark } from "./styled";

interface Step {
  title: string;
  body: string;
  /** An example under the body, such as the quote the assistant used. */
  extra?: ReactNode;
}

interface StepsProps {
  steps: Step[];
  /** Numbers the steps. Otherwise each one gets an arrow, for a list with no order. */
  ordered?: boolean;
}

/** A ruled list. It is an `ol` only when the order means something. */
export function Steps({ steps, ordered = false }: StepsProps) {
  const List = ordered ? "ol" : "ul";
  return (
    <List>
      {steps.map((step, index) => (
        <Item key={step.title}>
          <Mark aria-hidden="true">{ordered ? String(index + 1).padStart(2, "0") : "→"}</Mark>
          <div>
            <h3>{step.title}</h3>
            <Body>{step.body}</Body>
            {step.extra ? <Extra>{step.extra}</Extra> : null}
          </div>
        </Item>
      ))}
    </List>
  );
}
