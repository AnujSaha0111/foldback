"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { Line as Root } from "./styled";

/** The steps' progress rule. Only this wrapper runs in the browser; the steps stay server-rendered. */
export function Line({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollProgress(ref);
  return <Root ref={ref}>{children}</Root>;
}
