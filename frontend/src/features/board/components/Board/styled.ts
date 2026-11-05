"use client";

import { styled } from "@mui/material/styles";

export const Head = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--s-3) var(--s-4)",
  "& h1": { marginRight: "var(--s-2)" },
});

/** The four numbers that matter, read left to right. */
export const Stats = styled("section")({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  marginTop: "var(--s-5)",
  overflow: "hidden",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
  background: "var(--bg)",
  boxShadow: "var(--shadow-2)",
  fontVariantNumeric: "tabular-nums",
  "@media (min-width: 900px)": { gridTemplateColumns: "1.1fr 1.3fr 1fr 1fr" },
});

export const Stat = styled("div")({
  padding: "0.875rem 1.125rem",
  borderRight: "1px solid var(--line-soft)",
  borderBottom: "1px solid var(--line-soft)",
  "@media (min-width: 900px)": { borderBottom: 0, "&:last-child": { borderRight: 0 } },
  "& > span": { fontSize: "0.8125rem", color: "var(--text-2)" },
  "& > div": {
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
    marginTop: "6px",
    fontSize: "1.0625rem",
    fontWeight: 500,
  },
  "& > small": { display: "block", marginTop: "2px", fontSize: "0.75rem", color: "var(--text-3)" },
});

export const Meter = styled("div")({
  height: "4px",
  marginTop: "10px",
  background: "var(--layer-hover)",
  "& i": {
    display: "block",
    height: "100%",
    background: "var(--blue)",
    transformOrigin: "0 50%",
    transform: "scaleX(var(--v))",
    transition: "transform var(--d-5) var(--ease-out-quart)",
  },
});

export const Reason = styled("p")({
  marginTop: "var(--s-4)",
  padding: "var(--s-3) var(--s-4)",
  borderLeft: "3px solid var(--blue)",
  background: "var(--blue-50)",
});

export const Layout = styled("div")({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "var(--s-5)",
  alignItems: "start",
  marginTop: "var(--s-6)",
});

export const Back = styled("div")({ marginTop: "var(--s-5)" });

/** The keyboard way to open a person, beside the board's controls. */
export const Pick = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: "var(--s-2)",
  fontSize: "var(--fs-small)",
  color: "var(--text-2)",
});

/** The deadline's countdown, in the deadline's own colour. */
export const Urgent = styled("small")({
  display: "block",
  marginTop: "2px",
  fontSize: "0.75rem",
  fontWeight: 500,
  color: "var(--sun-text)",
});
