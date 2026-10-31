"use client";

import { styled } from "@mui/material/styles";
import { HOVER } from "@/theme/media";

/** Wide tables scroll inside this frame, so the page itself never scrolls sideways. */
export const Frame = styled("div")({
  // Positioned, so screen-reader-only labels inside stay inside the scroll area too.
  position: "relative",
  overflowX: "auto",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
  background: "var(--bg)",
  boxShadow: "var(--shadow-1)",
});

export const Table = styled("table")({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.9375rem",
  "& th": {
    padding: "var(--s-3) var(--s-4)",
    background: "var(--bg-subtle)",
    borderBottom: "1px solid var(--line)",
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "var(--text-2)",
    textAlign: "left",
    whiteSpace: "nowrap",
  },
  "& td": {
    height: "3.5rem",
    padding: "0 var(--s-4)",
    borderBottom: "1px solid var(--line-soft)",
    verticalAlign: "middle",
  },
  "& tr:last-child td": { borderBottom: 0 },
  "& [data-align='right']": { textAlign: "right" },
  // Highlight appears at once and fades out, like native lists.
  "& tbody tr": { transition: "background-color 150ms var(--ease-out-quad)" },
  // The padding brings the link's target up to 24 px without moving the row.
  "& a": {
    display: "inline-block",
    paddingBlock: "2px",
    color: "var(--text)",
    fontWeight: 500,
    textDecoration: "none",
  },
  [HOVER]: {
    "& tbody tr:hover": { background: "var(--layer-selected)", transitionDuration: "0ms" },
    "& a:hover": { color: "var(--link)" },
  },
});
