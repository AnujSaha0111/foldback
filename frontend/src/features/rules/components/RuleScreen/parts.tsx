import { VOICE_NOTE } from "@/features/legal/copy";
import type { useSpeech } from "../../useSpeech";
import { Count, Empty, Flow, Glyph, Heard, Loader, Muted, SampleLink, Skeleton, Tools, Ways } from "./styled";

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
interface TextToolsProps {
  count: number;
  onSample: () => void;
  speech: ReturnType<typeof useSpeech>;
}

export function TextTools({ count, onSample, speech }: TextToolsProps) {
  return (
    <>
      <Tools>
        <Ways>
          <SampleLink type="button" onClick={onSample}>
            Use the sample cabin chat
          </SampleLink>
          {speech.supported ? (
            <SampleLink type="button" aria-pressed={speech.listening} onClick={speech.toggle}>
              {speech.listening ? "Stop listening" : "Speak the plan"}
            </SampleLink>
          ) : null}
        </Ways>
        <Count>{count} characters</Count>
      </Tools>
      {/* Rendered empty first, so screen readers hear the change when listening starts. */}
      <Heard aria-live="polite">
        {speech.listening
          ? `Listening. Say who is in, the price and the deadline, then stop. ${VOICE_NOTE}`
          : speech.problem}
      </Heard>
    </>
  );
}
