"use client";

import { styled } from "@mui/material/styles";

const WIDE = "@media (min-width: 900px)";

export const Root = styled("div")({
  display: "grid",
  minHeight: "calc(100dvh - 4rem)",
  [WIDE]: { gridTemplateColumns: "minmax(0, 32rem) minmax(0, 1fr)" },
});

export const Column = styled("div")({
  width: "100%",
  maxWidth: "32rem",
  padding: "var(--s-6) var(--gutter) var(--s-7)",
  "& h1": { marginBottom: "var(--s-2)" },
  [WIDE]: { paddingInline: "var(--s-7)" },
});

export const Switch = styled("p")({ color: "var(--text-2)" });

export const Fields = styled("form")({
  marginTop: "var(--s-6)",
  "& > button": { marginTop: "var(--s-5)" },
});

export const Or = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: "var(--s-3)",
  margin: "var(--s-5) 0",
  fontSize: "var(--fs-small)",
  color: "var(--text-2)",
  "&::before, &::after": { content: '""', flex: 1, height: "1px", background: "var(--line)" },
});

export const Note = styled("p")({
  marginTop: "var(--s-3)",
  fontSize: "var(--fs-caption)",
  color: "var(--text-2)",
});

export const Panel = styled("aside")({
  display: "none",
  padding: "var(--s-7)",
  background: "var(--sky)",
  color: "var(--on-sky)",
  [WIDE]: { display: "block" },
});

export const PanelTitle = styled("p")({
  maxWidth: "11ch",
  fontSize: "clamp(2rem, 1rem + 3vw, 3.5rem)",
  fontWeight: 600,
  letterSpacing: "-0.035em",
  lineHeight: 1.02,
});

export const Mark = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(2, 5.5rem)",
  gap: "0.9rem",
  marginTop: "var(--s-7)",
  "& i": { display: "block", width: "5.5rem", height: "5.5rem", background: "var(--navy)" },
  "& i:last-of-type": { border: "6px solid var(--blue)", background: "transparent" },
});
