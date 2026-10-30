"use client";

import { styled } from "@mui/material/styles";

export const Frame = styled("div")({
  overflow: "hidden",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
  background: "var(--bg)",
  boxShadow: "var(--shadow-2)",
  // Bryntum's own class names, tied to our tokens. The marker classes and `fb-released` come from the projection.
  "& .b-sch-event": { borderRadius: "var(--r-tag)", fontWeight: 600 },
  "& .b-sch-event.fb-released": {
    background: "transparent",
    boxShadow: "inset 0 0 0 1px var(--text-3)",
    color: "var(--text)",
  },
  // A bar too short for its word: the word sits beside it, so the status is never clipped.
  "& .b-sch-event.fb-short": { overflow: "visible" },
  "& .b-sch-event.fb-short .b-sch-event-content": {
    position: "absolute",
    left: "100%",
    marginLeft: "6px",
    whiteSpace: "nowrap",
    color: "var(--text)",
  },
  "& .fb-now": { "--b-timerange-color": "var(--blue)" },
  "& .fb-deadline": { "--b-timerange-color": "var(--sun)" },
  "& .fb-grace": { "--b-timerange-color": "var(--text)" },
});

/** Holds the board's place while the Bryntum chunk loads, so the page does not jump. */
export const Skeleton = styled("div")({
  height: "20rem",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
  background:
    "linear-gradient(90deg, var(--layer-hover) 0%, var(--bg-subtle) 50%, var(--layer-hover) 100%) 0 0 / 200% 100%",
  animation: "fb-shimmer 1.6s linear infinite",
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

export const Legend = styled("span")({
  display: "inline-flex",
  gap: "var(--s-4)",
  "& span": { display: "inline-flex", alignItems: "center", gap: "6px" },
  "& span::before": { content: '""', width: "14px", height: "2px" },
  "& [data-kind='now']::before": { background: "var(--blue)" },
  "& [data-kind='deadline']::before": { background: "var(--sun)" },
  "& [data-kind='grace']::before": {
    background: "repeating-linear-gradient(90deg, var(--text) 0 3px, transparent 3px 6px)",
  },
});
