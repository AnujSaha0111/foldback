"use client";

import { styled } from "@mui/material/styles";
import type { CSSObject } from "@mui/material/styles";
import type { Tone } from "@/lib/status";

const fill = (name: string): CSSObject => ({
  background: `var(--st-${name}-bg)`,
  color: `var(--st-${name}-fg)`,
});

/** Every status is a word on a fill, or an outline for Released, so colour is never the only signal. */
export const TONES: Record<Tone, CSSObject> = {
  waiting: fill("waiting"),
  held: fill("held"),
  kept: fill("kept"),
  failed: fill("failed"),
  attention: fill("attention"),
  released: {
    background: "transparent",
    color: "var(--st-released-fg)",
    borderColor: "var(--st-released-line)",
  },
};

/** A change of status pops the tag in, from .86 and never from nothing. */
export const Tag = styled("span", { shouldForwardProp: (prop) => prop !== "$tone" })<{ $tone: Tone }>(
  ({ $tone }) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    height: "1.375rem",
    padding: "0 var(--s-2)",
    border: "1px solid transparent",
    borderRadius: "var(--r-tag)",
    fontSize: "var(--fs-caption)",
    fontWeight: 600,
    letterSpacing: "0.01em",
    lineHeight: 1,
    whiteSpace: "nowrap",
    "&[data-pop]": { animation: "fb-pop 520ms var(--ease-spring) both" },
    ...TONES[$tone],
  }),
);

export const Live = styled("span")({
  position: "relative",
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: "currentColor",
  "&::after": {
    content: '""',
    position: "absolute",
    inset: "-3px",
    borderRadius: "50%",
    border: "1px solid currentColor",
    animation: "fb-live 2s var(--ease-out-quart) infinite",
  },
});
