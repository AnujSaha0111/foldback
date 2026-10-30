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
import { Callout } from "@/components/Callout";
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
import { Actions, Grid, Head, Muted, Result, SampleLink } from "./styled";

/** A question from the API is a step in the flow, so it is shown as a question and not as an error. */
const failure = (error: ApiFailure | undefined) => (isQuestion(error) ? undefined : error);

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
  const [readRule, read] = useReadRuleMutation();
  const [clarifyRule, clarify] = useClarifyRuleMutation();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clarify.reset();
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

  return (
    <>
      <Head>
        <h1>New plan</h1>
        <p>Paste the chat. Read the plan. Confirm it. Then send each person their link.</p>
      </Head>
      <Grid>
        <form onSubmit={(event) => void submit(event)}>
          <TextAreaField
            label="Paste the group chat or describe the plan"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={10}
            maxLength={MAX_RULE_TEXT_CHARS}
            placeholder={CABIN_RULE_TEXT}
            required
            help={
              <SampleLink type="button" onClick={() => setText(CABIN_CHAT_TEXT)}>
                Use the sample cabin chat
              </SampleLink>
            }
          />
          <Actions>
            <Button type="submit" disabled={read.isLoading}>
              {read.isLoading ? "Reading…" : "Read the plan"}
            </Button>
            <FormError error={failure(read.error)} />
          </Actions>
        </form>
        <Result aria-live="polite">
          {read.isLoading ? (
            <Callout title="Reading…">
              <Muted>Finding the price, the people and the deadline in your text.</Muted>
            </Callout>
          ) : null}
          {!read.isLoading && reading.kind === "none" ? (
            <Callout title="Nothing read yet">
              <Muted>
                The plan appears here once you press Read the plan. Nothing is active until you confirm.
              </Muted>
            </Callout>
          ) : null}
          {!read.isLoading && reading.kind === "question" ? (
            <ClarifyForm
              question={reading.question}
              busy={clarify.isLoading}
              error={failure(clarify.error)}
              onAnswer={(value) => answer(reading.contractId, value)}
            />
          ) : null}
          {!read.isLoading && reading.kind === "ready" ? (
            <TermsList contractId={reading.contractId} extraction={reading.extraction} />
          ) : null}
        </Result>
      </Grid>
    </>
  );
}
