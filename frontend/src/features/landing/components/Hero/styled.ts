"use client";

import { styled } from "@mui/material/styles";
import { Inner, onSky } from "@/components/Page/styled";

export const Root = styled("section")({ background: "var(--sky)", color: "var(--on-sky)" });

export const Grid = styled(Inner)({
  paddingBlock: "var(--s-7) 0",
  "@media (min-width: 768px)": { paddingBlockStart: "var(--s-8)" },
  "@media (min-width: 1024px)": {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
    gap: "var(--s-7)",
    alignItems: "end",
    paddingBlockStart: "var(--s-9)",
  },
});

export const Copy = styled("div")({ ...onSky, paddingBottom: "var(--s-7)" });

export const Title = styled("h1")({
  maxWidth: "15ch",
  fontSize: "var(--fs-display)",
  fontWeight: 600,
  letterSpacing: "-0.035em",
  lineHeight: 1.02,
  textWrap: "balance",
});

export const Lead = styled("p")({
  maxWidth: "34rem",
  marginTop: "var(--s-4)",
  fontSize: "var(--fs-lead)",
  lineHeight: 1.45,
});

export const Actions = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--s-3)",
  marginTop: "var(--s-5)",
});

export const Note = styled("p")({
  maxWidth: "34rem",
  marginTop: "var(--s-3)",
  fontSize: "var(--fs-small)",
});
