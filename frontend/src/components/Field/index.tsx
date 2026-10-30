"use client";

import { useId } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { Area, Control, Help, Input, Label, Root } from "./styled";

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

export function Field({ label, help, ...input }: FieldProps) {
  const { id, helpId, describedBy } = useFieldIds(help);
  return (
    <Root>
      <Label htmlFor={id}>{label}</Label>
      <Control>
        <Input id={id} aria-describedby={describedBy} {...input} />
      </Control>
      {help ? <Help id={helpId}>{help}</Help> : null}
    </Root>
  );
}

export function TextAreaField({ label, help, ...area }: TextAreaFieldProps) {
  const { id, helpId, describedBy } = useFieldIds(help);
  return (
    <Root>
      <Label htmlFor={id}>{label}</Label>
      <Control>
        <Area id={id} aria-describedby={describedBy} {...area} />
      </Control>
      {help ? <Help id={helpId}>{help}</Help> : null}
    </Root>
  );
}
