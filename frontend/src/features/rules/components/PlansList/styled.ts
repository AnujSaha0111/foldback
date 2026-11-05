"use client";

import { styled } from "@mui/material/styles";
import { HOVER } from "@/theme/media";

export const Root = styled("section")({
  marginTop: "var(--s-8)",
  // The arrow slides in on the row under the pointer.
  [HOVER]: { "& tbody tr:hover [data-go]": { opacity: 1, transform: "none" } },
});

/** One square per person: blue when held, an orange outline for each still open. */
export const Holds = styled("span")({
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--s-3)",
  fontFamily: "var(--font-mono)",
  whiteSpace: "nowrap",
  "& > span": { display: "inline-flex", gap: "3px" },
  "& i": { width: "9px", height: "9px", boxShadow: "inset 0 0 0 1.5px var(--sun)" },
  "& i[data-on='true']": { background: "var(--blue)", boxShadow: "none" },
});

export const Head = styled("div")({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  marginBottom: "var(--s-4)",
  "& > span": { fontSize: "var(--fs-caption)", color: "var(--text-3)" },
});

export const Sub = styled("span")({
  display: "block",
  marginTop: "1px",
  fontSize: "0.8125rem",
  color: "var(--text-3)",
});

export const Go = styled("span")({
  display: "inline-block",
  color: "var(--text-2)",
  opacity: 0,
  transform: "translateX(-6px)",
  transition: "opacity var(--d-2) var(--ease-out-quad), transform var(--d-3) var(--ease-out-expo)",
});

/** A loading row, as tall as a real one. */
export const Line = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--s-6)",
  height: "3.5rem",
  paddingInline: "var(--s-4)",
  borderBottom: "1px solid var(--line-soft)",
  "&:last-child": { borderBottom: 0 },
});
