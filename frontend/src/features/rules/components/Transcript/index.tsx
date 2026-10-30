import { Button } from "@/components/Button";
import type { ApiExtraction } from "@/types/generated/api-types";
import { markQuotes } from "../../reading";
import { Body, Head, Mark } from "./styled";

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
        {markQuotes(text, evidence).map((segment, index) =>
          segment.field ? (
            <Mark key={index} data-lit={segment.field === active}>
              {segment.text}
            </Mark>
          ) : (
            segment.text
          ),
        )}
      </Body>
    </div>
  );
}
