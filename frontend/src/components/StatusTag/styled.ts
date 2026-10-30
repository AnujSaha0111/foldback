"use client";

import { styled } from "@mui/material/styles";
import type { CSSObject } from "@mui/material/styles";
import type { Tone } from "@/lib/status";

const fill = (name: string): CSSObject => ({
  background: `var(--st-${name}-bg)`,
  color: `var(--st-${name}-fg)`,
});

/** Every status is a word on a fill, or an outline for Released, so colour is never the only signal. */
const TONES: Record<Tone, CSSObject> = {
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

export const Tag = styled("span", { shouldForwardProp: (prop) => prop !== "$tone" })<{ $tone: Tone }>(
  ({ $tone }) => ({
    display: "inline-flex",
    alignItems: "center",
    minHeight: "1.5rem",
    padding: "0 var(--s-2)",
    border: "1px solid transparent",
    fontSize: "var(--fs-caption)",
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: "nowrap",
    ...TONES[$tone],
  }),
);
