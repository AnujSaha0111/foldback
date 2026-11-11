import type { ReactNode } from "react";
import { Actions, Root } from "./styled";

interface MessageProps {
  title: string;
  /** Text and the ways out (links or buttons). */
  children: ReactNode;
}

/** A page-level message, for "not found" and crashes. */
export function Message({ title, children }: MessageProps) {
  return (
    <Root>
      <h1>{title}</h1>
      <Actions>{children}</Actions>
    </Root>
  );
}
