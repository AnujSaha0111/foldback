"use client";

import { styled } from "@mui/material/styles";
import { TONES } from "@/components/StatusTag/styled";
import type { Tone } from "@/lib/status";

export const Root = styled("div")({
  overflow: "hidden",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
  background: "var(--bg)",
  boxShadow: "var(--shadow-3)",
  "& > div:first-of-type": { background: "var(--bg-subtle)", color: "var(--text-2)" },
});

export const Row = styled("div")({
  display: "grid",
  gridTemplateColumns: "7.5rem minmax(0, 1fr)",
  alignItems: "center",
  borderTop: "1px solid var(--line)",
  "&:first-of-type": { borderTop: 0 },
});

export const Name = styled("div")({ padding: "var(--s-3) var(--s-4)", fontSize: "var(--fs-small)" });

export const Track = styled("div")({
  position: "relative",
  height: "2.75rem",
  marginRight: "var(--s-3)",
});

export const Marker = styled("span", { shouldForwardProp: (prop) => prop !== "$left" })<{ $left: string }>(
  ({ $left }) => ({
    position: "absolute",
    left: $left,
    top: "0.9rem",
    fontSize: "var(--fs-caption)",
    whiteSpace: "nowrap",
  }),
);

interface BarProps {
  $tone: Tone;
  $width: string;
}

export const Bar = styled("span", {
  shouldForwardProp: (prop) => prop !== "$tone" && prop !== "$width",
})<BarProps>(({ $tone, $width }) => ({
  position: "absolute",
  left: 0,
  top: "0.5rem",
  bottom: "0.5rem",
  display: "flex",
  alignItems: "center",
  width: $width,
  padding: "0 0.6rem",
  borderRadius: "var(--r-tag)",
  fontSize: "var(--fs-caption)",
  fontWeight: 600,
  whiteSpace: "nowrap",
  transformOrigin: "0 50%",
  "[data-in='true'] &": { animation: "fb-grow var(--d-5) var(--ease-out-quart) both" },
  ...TONES[$tone],
}));
