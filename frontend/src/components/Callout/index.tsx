import type { ReactNode } from "react";
import { Root, Title } from "./styled";

interface CalloutProps {
  title: string;
  warn?: boolean;
  children: ReactNode;
}

export function Callout({ title, warn = false, children }: CalloutProps) {
  return (
    <Root $warn={warn}>
      <Title>{title}</Title>
      {children}
    </Root>
  );
}
