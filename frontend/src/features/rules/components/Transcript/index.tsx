import { Button } from "@/components/Button";
import type { ApiExtraction } from "@/types/generated/api-types";
import { chatPrefix, markQuotes, toLines } from "../../reading";
import type { Segment } from "../../reading";
import { Body, Head, Mark, Speaker, Stamp } from "./styled";

interface TranscriptProps {
  text: string;
  evidence: ApiExtraction["evidence"];
  /** The field whose term is being pointed at, so its quote lights up. */
  active: string | null;
  onEdit: () => void;
}

/** The pasted text with every line the model used marked, so the organizer can see where each value came from. */
export function Transcript({ text, evidence, active, onEdit }: TranscriptProps) {
  return (
    <div>
      <Head>
        <span>Read from your text</span>
        <Button variant="link" arrow={false} onClick={onEdit}>
          Edit text
        </Button>
      </Head>
      <Body tabIndex={0} aria-label="Your text, with the lines that were read marked">
        {toLines(markQuotes(text, evidence)).map((line, row) => (
          <Line key={row} segments={line} active={active} />
        ))}
      </Body>
    </div>
  );
}

/** One line of the chat: its time in grey mono and its speaker in bold, when it has them, then the message. */
function Line({ segments, active }: { segments: Segment[]; active: string | null }) {
  const [first, ...rest] = segments;
  const prefix = first && !first.field ? chatPrefix(first.text) : null;
  const parts = prefix ? [{ text: prefix.rest, field: null }, ...rest] : segments;
  return (
    <p>
      {prefix ? (
        <>
          <Stamp>{prefix.time}</Stamp>
          <Speaker>{prefix.speaker}:</Speaker>{" "}
        </>
      ) : null}
      {parts.map((part, index) =>
        part.field ? (
          <Mark key={index} data-lit={part.field === active}>
            {part.text}
          </Mark>
        ) : (
          part.text
        ),
      )}
    </p>
  );
}
