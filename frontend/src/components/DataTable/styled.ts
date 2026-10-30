"use client";

import { styled } from "@mui/material/styles";

/** Wide tables scroll inside this frame, so the page itself never scrolls sideways. */
export const Frame = styled("div")({ overflowX: "auto" });

export const Table = styled("table")({
  width: "100%",
  borderCollapse: "collapse",
  background: "var(--bg)",
  fontSize: "var(--fs-small)",
  "& th": {
    padding: "var(--s-3) var(--s-4)",
    background: "var(--layer-2)",
    fontWeight: 600,
    textAlign: "left",
    whiteSpace: "nowrap",
  },
  "& td": {
    padding: "var(--s-3) var(--s-4)",
    borderBottom: "1px solid var(--line)",
    verticalAlign: "middle",
  },
  "& a": { color: "var(--link)", fontWeight: 500 },
});
