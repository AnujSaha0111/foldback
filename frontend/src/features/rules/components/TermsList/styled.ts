"use client";

import { styled } from "@mui/material/styles";

export const Intro = styled("p")({ marginBottom: "var(--s-4)", color: "var(--text-2)" });

export const List = styled("dl")({ margin: 0, borderTop: "1px solid var(--line-strong)" });

export const Row = styled("div")({
  display: "grid",
  gap: "var(--s-1)",
  padding: "var(--s-4) 0",
  borderBottom: "1px solid var(--line)",
  "@media (min-width: 600px)": { gridTemplateColumns: "11rem minmax(0, 1fr)", gap: "var(--s-4)" },
  "& dt": { fontSize: "var(--fs-small)", color: "var(--text-2)" },
  "& dd": { margin: 0 },
});

export const Quote = styled("span")({
  display: "block",
  marginTop: "var(--s-1)",
  fontSize: "var(--fs-small)",
  color: "var(--text-2)",
});

export const Chips = styled("div")({ display: "flex", flexWrap: "wrap", gap: "var(--s-2)" });

export const Chip = styled("span")({
  display: "inline-block",
  padding: "0.25rem 0.65rem",
  background: "var(--layer-2)",
  fontSize: "var(--fs-small)",
});

export const Confirm = styled("div")({
  marginTop: "var(--s-5)",
  "& > p:last-child": {
    maxWidth: "34rem",
    marginTop: "var(--s-3)",
    fontSize: "var(--fs-small)",
    color: "var(--text-2)",
  },
});
