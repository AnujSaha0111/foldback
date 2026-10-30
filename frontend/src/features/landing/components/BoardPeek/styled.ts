"use client";

import { styled } from "@mui/material/styles";
import { TONES } from "@/components/StatusTag/styled";
import type { Tone } from "@/lib/status";

/** A soft light field for the glass board to sit on. */
export const Stage = styled("div")({
  position: "relative",
  padding: "var(--s-5)",
  borderRadius: "var(--r-panel-lg)",
  background:
    "radial-gradient(60% 80% at 80% 20%, rgba(96, 205, 255, 0.35), transparent 70%), radial-gradient(50% 60% at 10% 90%, rgba(255, 181, 71, 0.25), transparent 70%), var(--bg-subtle)",
});

export const Root = styled("div")({
  overflowX: "auto",
  border: "1px solid var(--glass-line)",
  borderRadius: "var(--r-panel)",
  background: "var(--glass-bg)",
  WebkitBackdropFilter: "var(--glass-blur)",
  backdropFilter: "var(--glass-blur)",
  boxShadow: "var(--glass-shine), var(--shadow-3)",
});

export const Grid = styled("div")({
  position: "relative",
  minWidth: "32rem",
  display: "grid",
  gridTemplateColumns: "7.5rem repeat(3, minmax(0, 1fr))",
});

export const HeadCell = styled("div")({
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
});

export const Name = styled("div")({
  height: "3.25rem",
  display: "flex",
  alignItems: "center",
  gap: "var(--s-2)",
  padding: "0 var(--s-3)",
  borderBottom: "1px solid var(--line-soft)",
  fontSize: "0.875rem",
  fontWeight: 500,
});

/** The three day columns of one row, with the row's bar laid over them. */
export const Track = styled("div")({
  position: "relative",
  gridColumn: "span 3",
  height: "3.25rem",
  borderBottom: "1px solid var(--line-soft)",
  backgroundImage:
    "linear-gradient(90deg, var(--line-soft) 1px, transparent 1px), linear-gradient(90deg, transparent calc(33.33% - 0.5px), var(--line-soft) calc(33.33% - 0.5px), var(--line-soft) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), var(--line-soft) calc(66.66% - 0.5px), var(--line-soft) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px))",
});

interface BarProps {
  $tone: Tone;
  $left: string;
  $width: string;
}

export const Bar = styled("span", {
  shouldForwardProp: (prop) => prop !== "$tone" && prop !== "$width" && prop !== "$left",
})<BarProps>(({ $tone, $left, $width }) => ({
  position: "absolute",
  top: "0.7rem",
  height: "1.85rem",
  left: $left,
  width: $width,
  display: "flex",
  alignItems: "center",
  padding: "0 0.6rem",
  borderRadius: "var(--r-tag)",
  fontSize: "var(--fs-caption)",
  fontWeight: 600,
  whiteSpace: "nowrap",
  transformOrigin: "0 50%",
  "[data-in='true'] &": { animation: "fb-grow var(--d-5) var(--ease-out-quart) both" },
  ...TONES[$tone],
  ...($tone === "waiting"
    ? {
        background:
          "repeating-linear-gradient(135deg, var(--st-waiting-bg) 0 8px, color-mix(in srgb, var(--st-waiting-bg) 70%, transparent) 8px 16px)",
      }
    : {}),
}));

/** Deadline in orange (the one thing that matters), grace as a dashed ink line. */
export const Marker = styled("span", { shouldForwardProp: (prop) => prop !== "$left" && prop !== "$grace" })<{
  $left: string;
  $grace?: boolean;
}>(({ $left, $grace }) => ({
  position: "absolute",
  top: "2.75rem",
  bottom: 0,
  left: `calc(7.5rem + (100% - 7.5rem) * ${$left})`,
  width: "2px",
  marginLeft: "-1px",
  pointerEvents: "none",
  background: $grace
    ? "repeating-linear-gradient(to bottom, var(--text) 0 5px, transparent 5px 10px)"
    : "var(--sun)",
}));

export const Initials = styled("span")({
  display: "grid",
  placeItems: "center",
  width: "1.5rem",
  height: "1.5rem",
  background: "var(--sky)",
  color: "#000",
  fontSize: "0.6875rem",
  fontWeight: 600,
  clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)",
});
