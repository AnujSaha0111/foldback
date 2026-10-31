import type { ReactNode } from "react";
import { Root } from "./styled";

interface BadgeProps {
  children: ReactNode;
}

/** An outlined label for a fact that is not a status, such as `Sample` or `Guest, expires in 7 days`. */
export function Badge({ children }: BadgeProps) {
  return <Root>{children}</Root>;
}
