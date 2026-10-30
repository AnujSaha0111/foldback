"use client";

import { useId } from "react";
import type { InputHTMLAttributes } from "react";
import { Help, Input, Label, Root } from "./styled";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  help?: string;
}

/** A label above a filled box. Every input has a visible label, and the helper is tied to it for screen readers. */
export function Field({ label, help, ...input }: FieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  return (
    <Root>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-describedby={help ? helpId : undefined} {...input} />
      {help ? <Help id={helpId}>{help}</Help> : null}
    </Root>
  );
}
