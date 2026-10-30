import { Empty, Flow, Glyph, Loader, Muted, Skeleton } from "./styled";

const STEPS = ["Paste", "Read", "Confirm", "Share links"];

const four = (
  <>
    <i />
    <i />
    <i />
    <i />
  </>
);

/** Where the organizer is: Paste, Read, Confirm, Share links. Steps before the current one read as done. */
export function FlowSteps({ step }: { step: number }) {
  return (
    <Flow aria-label="Progress">
      {STEPS.map((label, index) => (
        <li
          key={label}
          aria-current={index === step ? "step" : undefined}
          data-state={index < step ? "done" : undefined}
        >
          <b>{index + 1}</b>
          <span>{label}</span>
        </li>
      ))}
    </Flow>
  );
}

/** The result's layout is known, so a skeleton holds its place while the model reads. */
export function ReadingNow() {
  return (
    <>
      <p>
        <Loader aria-hidden="true">{four}</Loader>
        Reading…
      </p>
      <Muted>Finding the price, the people and the deadline in your text.</Muted>
      <Skeleton aria-hidden="true">
        {four}
        <i />
        <i />
      </Skeleton>
    </>
  );
}

export function NothingRead() {
  return (
    <Empty>
      <Glyph aria-hidden="true">{four}</Glyph>
      <p>Nothing read yet</p>
      <Muted>The plan appears here once you press Read the plan. Nothing is active until you confirm.</Muted>
    </Empty>
  );
}
