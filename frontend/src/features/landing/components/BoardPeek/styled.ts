"use client";

import { styled } from "@mui/material/styles";
import { TONES } from "@/components/StatusTag/styled";
import type { Tone } from "@/lib/status";

export const Root = styled("div")({
  border: "1px solid var(--line-strong)",
  background: "var(--bg)",
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
  padding: "0 0.4rem",
  fontSize: "var(--fs-caption)",
  fontWeight: 500,
  whiteSpace: "nowrap",
  ...TONES[$tone],
}));
