"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { ApiFailure } from "@/api/baseApi";
import { Button } from "@/components/Button";
import { Callout } from "@/components/Callout";
import { Field } from "@/components/Field";
import { FormError } from "@/components/FormError";
import { MAX_CLARIFY_ANSWER_CHARS } from "@/types/generated/rules";
import { Form } from "./styled";

interface ClarifyFormProps {
  question: string;
  busy: boolean;
  error: ApiFailure | undefined;
  /** Resolves true once the answer was accepted. On a failure the typed text stays, so it can be sent again. */
  onAnswer: (answer: string) => Promise<boolean>;
}

/** The server asks in plain words. The answer is added to the chat and the whole thing is read again. */
export function ClarifyForm({ question, busy, error, onAnswer }: ClarifyFormProps) {
  const [answer, setAnswer] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await onAnswer(answer.trim())) setAnswer("");
  };

  return (
    <>
      <Callout title="One piece is missing">
        <p>{question}</p>
      </Callout>
      <Form onSubmit={(event) => void submit(event)}>
        <Field
          label="Your answer"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          maxLength={MAX_CLARIFY_ANSWER_CHARS}
          autoComplete="off"
          required
        />
        <Button type="submit" loading={busy}>
          {busy ? "Reading…" : "Answer"}
        </Button>
        <FormError error={error} />
      </Form>
    </>
  );
}
