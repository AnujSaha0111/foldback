"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { ApiFailure } from "@/api/baseApi";
import {
  DEMO_RESET_KEY,
  useClarifyRuleMutation,
  useReadRuleMutation,
  useResetDemoMutation,
} from "@/api/contractsApi";
import { Button } from "@/components/Button";
import { TextAreaField } from "@/components/Field";
import { FormError } from "@/components/FormError";
import {
  CABIN_CHAT_TEXT,
  CABIN_RULE_TEXT,
  FIXTURE_TEXTS,
  MAX_RULE_TEXT_CHARS,
} from "@/types/generated/rules";
import { isQuestion, nextReading } from "../../reading";
import type { Reading } from "../../reading";
import { ClarifyForm } from "../ClarifyForm";
import { TermsList } from "../TermsList";
import { Transcript } from "../Transcript";
import { FlowSteps, NothingRead, ReadingNow, TextTools } from "./parts";
import { Actions, Grid, Head, Panel } from "./styled";

/** A question from the API is a step in the flow, so it is shown as a question and not as an error. */
const failure = (error: ApiFailure | undefined) => (isQuestion(error) ? undefined : error);

/** Paste (0), Read (1, also while answering a question), Confirm (2). */
const stepOf = (loading: boolean, reading: Reading) =>
  loading || reading.kind === "question" ? 1 : reading.kind === "ready" ? 2 : 0;

/** A demo reset deletes the plan being read, so it starts the screen again rather than leave terms nobody can confirm. */
export function RuleScreen() {
  const [, lastReset] = useResetDemoMutation({ fixedCacheKey: DEMO_RESET_KEY });
  const [resets, setResets] = useState<{ seen: number; count: number }>({ seen: 0, count: 0 });
  const stamp = lastReset.fulfilledTimeStamp;
  // Only a finished reset counts. While one is pending the stamp is gone, and a refused one must change nothing.
  if (stamp !== undefined && stamp !== resets.seen) setResets({ seen: stamp, count: resets.count + 1 });
  return <RuleFlow key={resets.count} />;
}

/** Paste, read, answer if asked, confirm. Nothing is active until the organizer confirms. */
function RuleFlow() {
  const [text, setText] = useState("");
  const [reading, setReading] = useState<Reading>({ kind: "none" });
  // After a read the text turns into a transcript with its quotes marked; Edit text brings the box back.
  const [editing, setEditing] = useState(false);
  const [pointedAt, setPointedAt] = useState<string | null>(null);
  const [readRule, read] = useReadRuleMutation();
  const [clarifyRule, clarify] = useClarifyRuleMutation();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clarify.reset();
    setEditing(false);
    const rule_text = text.trim();
    // The sample texts carry a fixed date, so "friday" means the same day as in the demo video.
    const body = FIXTURE_TEXTS.includes(rule_text) ? { rule_text, use_fixture_time: true } : { rule_text };
    setReading(nextReading(await readRule(body), { kind: "none" }));
  };

  const answer = async (id: string, value: string) => {
    const next = nextReading(await clarifyRule({ id, answer: value }), reading);
    setReading(next);
    return next !== reading;
  };

  const showTranscript = !read.isLoading && reading.kind === "ready" && !editing;

  return (
    <>
      <Head>
        <div>
          <h1>New plan</h1>
          <p>Paste the chat. Read the plan. Confirm it. Then send each person their link.</p>
        </div>
        <FlowSteps step={stepOf(read.isLoading, reading)} />
      </Head>
      <Grid>
        <Panel aria-label="Your text">
          {showTranscript && reading.kind === "ready" ? (
            <Transcript
              text={text}
              evidence={reading.extraction.evidence}
              active={pointedAt}
              onEdit={() => setEditing(true)}
            />
          ) : null}
          <form hidden={showTranscript} onSubmit={(event) => void submit(event)}>
            <TextAreaField
              label="Paste the group chat or describe the plan"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={10}
              maxLength={MAX_RULE_TEXT_CHARS}
              placeholder={CABIN_RULE_TEXT}
              required
            />
            <TextTools count={text.length} onSample={() => setText(CABIN_CHAT_TEXT)} />
            <Actions>
              <Button type="submit" disabled={read.isLoading}>
                {read.isLoading ? "Reading…" : "Read the plan"}
              </Button>
              <FormError error={failure(read.error)} />
            </Actions>
          </form>
        </Panel>
        <Panel $raised aria-live="polite" aria-label="The plan as read">
          {read.isLoading ? (
            <ReadingNow />
          ) : (
            <Outcome
              reading={reading}
              clarifying={clarify.isLoading}
              clarifyError={failure(clarify.error)}
              onAnswer={answer}
              onPoint={setPointedAt}
            />
          )}
        </Panel>
      </Grid>
    </>
  );
}

interface OutcomeProps {
  reading: Reading;
  clarifying: boolean;
  clarifyError: ApiFailure | undefined;
  onAnswer: (id: string, value: string) => Promise<boolean>;
  onPoint: (field: string | null) => void;
}

/** What the read produced: nothing yet, a question to answer, or the terms to confirm. */
function Outcome({ reading, clarifying, clarifyError, onAnswer, onPoint }: OutcomeProps) {
  if (reading.kind === "none") return <NothingRead />;
  if (reading.kind === "question") {
    return (
      <ClarifyForm
        question={reading.question}
        busy={clarifying}
        error={clarifyError}
        onAnswer={(value) => onAnswer(reading.contractId, value)}
      />
    );
  }
  return <TermsList contractId={reading.contractId} extraction={reading.extraction} onPoint={onPoint} />;
}
