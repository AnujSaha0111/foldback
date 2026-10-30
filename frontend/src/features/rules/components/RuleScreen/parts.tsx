import { Count, Empty, Flow, Glyph, Loader, Muted, SampleLink, Skeleton, Tools } from "./styled";

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
      <p>Your plan appears here</p>
      <Muted>
        The assistant reads the amount, the people and the deadline from your text and shows the line it used
        for each. Nothing is active until you confirm.
      </Muted>
    </Empty>
  );
}

/** Under the text box: the sample chat on the left, a live character count on the right. */
export function TextTools({ count, onSample }: { count: number; onSample: () => void }) {
  return (
    <Tools>
      <SampleLink type="button" onClick={onSample}>
        Use the sample cabin chat
      </SampleLink>
      <Count>{count} characters</Count>
    </Tools>
  );
}
