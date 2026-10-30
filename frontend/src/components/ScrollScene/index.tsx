"use client";

import { useRef } from "react";
import type { ComponentProps } from "react";
import { useScrollProgress } from "@/hooks/useScrollProgress";

/** A section that tracks its own scroll position. Its content stays server-rendered; only this wrapper runs here. */
export function ScrollScene(props: ComponentProps<"section">) {
  const ref = useRef<HTMLElement>(null);
  useScrollProgress(ref);
  return <section ref={ref} {...props} />;
}
