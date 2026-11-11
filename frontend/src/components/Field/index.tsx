"use client";

import { useId, useState } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { Area, Control, Help, Input, Label, Reveal, Root } from "./styled";

interface LabelProps {
  label: string;
  help?: ReactNode;
}

type FieldProps = LabelProps & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;
type TextAreaFieldProps = LabelProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">;

/** Every control has a visible label, and its helper is tied to it for screen readers. */
function useFieldIds(help: ReactNode) {
  const id = useId();
  const helpId = `${id}-help`;
  return { id, helpId, describedBy: help ? helpId : undefined };
}

type FrameProps = LabelProps & { ids: ReturnType<typeof useFieldIds>; children: ReactNode };

/** The label, the control and its helper, the same for every field. */
function Frame({ label, help, ids, children }: FrameProps) {
  return (
    <Root>
      <Label htmlFor={ids.id}>{label}</Label>
      <Control>{children}</Control>
      {help ? <Help id={ids.helpId}>{help}</Help> : null}
    </Root>
  );
}

export function Field({ label, help, type, ...input }: FieldProps) {
  const ids = useFieldIds(help);
  const { id, describedBy } = ids;
  const [shown, setShown] = useState(false);
  const password = type === "password";
  return (
    <Frame label={label} help={help} ids={ids}>
      <Input
        id={id}
        type={password && shown ? "text" : type}
        aria-describedby={describedBy}
        data-reveal={password || undefined}
        {...input}
      />
      {password ? (
        <Reveal type="button" aria-controls={id} onClick={() => setShown(!shown)}>
          {shown ? "Hide" : "Show"}
          <span className="sr-only"> password</span>
        </Reveal>
      ) : null}
    </Frame>
  );
}

export function TextAreaField({ label, help, ...area }: TextAreaFieldProps) {
  const ids = useFieldIds(help);
  return (
    <Frame label={label} help={help} ids={ids}>
      <Area id={ids.id} aria-describedby={ids.describedBy} {...area} />
    </Frame>
  );
}
