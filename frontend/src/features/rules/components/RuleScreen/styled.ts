"use client";

import { styled } from "@mui/material/styles";

export const Head = styled("div")({
  marginBottom: "var(--s-6)",
  "& p": { marginTop: "var(--s-2)", color: "var(--text-2)" },
});

export const Grid = styled("div")({
  display: "grid",
  gap: "var(--s-6)",
  "@media (min-width: 1024px)": {
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)",
    gap: "var(--s-7)",
    alignItems: "start",
  },
});

export const Result = styled("div")({ minWidth: 0 });

export const Actions = styled("div")({ marginTop: "var(--s-4)" });

export const SampleLink = styled("button")({
  padding: 0,
  border: 0,
  background: "none",
  color: "var(--link)",
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
});

export const Muted = styled("p")({ color: "var(--text-2)" });
