"use client";

import { styled } from "@mui/material/styles";
import { TONES } from "@/components/StatusTag/styled";
import type { Tone } from "@/lib/status";

const PERSON = "11.75rem";

export const Frame = styled("div")({
  overflow: "hidden",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
  background: "var(--bg)",
  boxShadow: "var(--shadow-2)",
});

/** The board scrolls inside its own frame on small screens; the person column stays put. */
export const Scroll = styled("div")({ overflowX: "auto" });

export const Grid = styled("div", { shouldForwardProp: (prop) => prop !== "$cols" })<{ $cols: number }>(
  ({ $cols }) => ({
    position: "relative",
    minWidth: "47.5rem",
    display: "grid",
    gridTemplateColumns: `${PERSON} repeat(${$cols}, minmax(0, 1fr))`,
  }),
);

export const HeadCell = styled("div")({
  position: "sticky",
  top: 0,
  zIndex: 2,
  height: "2.75rem",
  display: "flex",
  alignItems: "center",
  padding: "0 var(--s-3)",
  background: "var(--bg-subtle)",
  borderBottom: "1px solid var(--line)",
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "var(--text-2)",
  "& + &": { borderLeft: "1px solid var(--line-soft)" },
  "&[data-today='true']": { color: "var(--text)" },
});

/** One person: a focusable row. Hover highlights at once and fades out; the selected row keeps an ink edge. */
export const Row = styled("div")({
  display: "contents",
  cursor: "pointer",
  "& > *": { transition: "background-color 150ms var(--ease-out-quad)" },
  "&:hover > *, &[aria-selected='true'] > *": { background: "var(--layer-selected)" },
  "&:hover > *": { transitionDuration: "0ms" },
  "&[aria-selected='true'] > :first-of-type": { boxShadow: "inset 3px 0 0 var(--text)" },
  "&:focus-visible > :first-of-type": { outline: "2px solid var(--focus)", outlineOffset: "-2px" },
});

export const Person = styled("div")({
  position: "sticky",
  left: 0,
  zIndex: 1,
  height: "3.75rem",
  display: "flex",
  alignItems: "center",
  gap: "0.625rem",
  padding: "0 var(--s-3)",
  background: "var(--bg)",
  borderBottom: "1px solid var(--line-soft)",
  fontSize: "0.9375rem",
  fontWeight: 500,
});

/** The day columns of one row, with the row's bar laid over them. */
export const Track = styled("div", { shouldForwardProp: (prop) => prop !== "$cols" })<{ $cols: number }>(
  ({ $cols }) => ({
    position: "relative",
    gridColumn: `span ${$cols}`,
    height: "3.75rem",
    borderBottom: "1px solid var(--line-soft)",
    backgroundImage: "linear-gradient(90deg, var(--line-soft) 1px, transparent 1px)",
    backgroundSize: `calc(100% / ${$cols}) 100%`,
  }),
);

interface BarProps {
  $tone: Tone;
  $left: number;
  $width: number;
}

const pct = (fraction: number) => `${(fraction * 100).toFixed(3)}%`;

export const Bar = styled("span", {
  shouldForwardProp: (prop) => prop !== "$tone" && prop !== "$left" && prop !== "$width",
})<BarProps>(({ $tone, $left, $width }) => ({
  position: "absolute",
  top: "0.9375rem",
  height: "1.875rem",
  left: pct($left),
  width: pct($width),
  minWidth: "3.5rem",
  display: "flex",
  alignItems: "center",
  padding: "0 0.625rem",
  borderRadius: "var(--r-tag)",
  fontSize: "var(--fs-caption)",
  fontWeight: 600,
  whiteSpace: "nowrap",
  transformOrigin: "0 50%",
  animation: "fb-grow var(--d-5) var(--ease-out-quart) both",
  ...TONES[$tone],
  ...($tone === "waiting"
    ? {
        background:
          "repeating-linear-gradient(135deg, var(--st-waiting-bg) 0 8px, color-mix(in srgb, var(--st-waiting-bg) 70%, transparent) 8px 16px)",
      }
    : {}),
}));

export type MarkerKind = "now" | "deadline" | "grace";

const LINE: Record<MarkerKind, string> = {
  now: "var(--blue)",
  deadline: "var(--sun)",
  grace: "repeating-linear-gradient(to bottom, var(--text) 0 5px, transparent 5px 10px)",
};

/** Now (blue), Deadline (orange, the one thing that matters) and Grace ends (dashed). Labels sit in the foot band. */
export const Marker = styled("span", { shouldForwardProp: (prop) => prop !== "$kind" && prop !== "$at" })<{
  $kind: MarkerKind;
  $at: number;
}>(({ $kind, $at }) => ({
  position: "absolute",
  top: "2.75rem",
  bottom: 0,
  left: `calc(${PERSON} + (100% - ${PERSON}) * ${$at.toFixed(5)})`,
  zIndex: 3,
  width: $kind === "grace" ? "1.5px" : "2px",
  marginLeft: "-1px",
  pointerEvents: "none",
  background: LINE[$kind],
  transition: "left var(--d-6) ease-in-out",
  "& > span": {
    position: "absolute",
    bottom: "0.6875rem",
    height: "1.375rem",
    display: "inline-flex",
    alignItems: "center",
    padding: "0 0.5rem",
    borderRadius: "var(--r-tag)",
    fontSize: "0.6875rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
    transform:
      $kind === "now"
        ? "translateX(calc(-100% - 6px))"
        : $kind === "deadline"
          ? "translateX(6px)"
          : "translateX(-50%)",
    ...($kind === "now" ? { background: "var(--blue)", color: "#fff" } : {}),
    ...($kind === "deadline" ? { backgroundImage: "var(--sun-grad)", color: "#000" } : {}),
    ...($kind === "grace"
      ? { background: "var(--bg)", color: "var(--text)", border: "1px solid var(--text)" }
      : {}),
  },
}));

export const Foot = styled("div")({
  gridColumn: "1 / -1",
  height: "2.75rem",
  background: "var(--bg-subtle)",
});

export const Caption = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: "var(--s-3)",
  padding: "0.625rem var(--s-4)",
  borderTop: "1px solid var(--line-soft)",
  fontSize: "var(--fs-caption)",
  color: "var(--text-3)",
});
