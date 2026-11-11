"use client";

import { styled } from "@mui/material/styles";
import { COARSE, TOUCH_TARGET } from "@/theme/media";

export const Root = styled("section")({
  marginTop: "var(--s-4)",
  padding: "var(--s-4)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
  display: "grid",
  gap: "var(--s-3)",
  "& h2": { fontSize: "1.125rem", fontWeight: 500 },
});

export const Log = styled("ol")({
  listStyle: "none",
  display: "grid",
  gap: "var(--s-3)",
  maxHeight: "28rem",
  overflowY: "auto",
  overscrollBehavior: "contain",
});

export const Turn = styled("li")({
  display: "grid",
  gap: "var(--s-2)",
  "&[data-role='user']": { justifySelf: "end", maxWidth: "80%", textAlign: "end", fontWeight: 500 },
  "&[data-role='system']": { color: "var(--text-2)", fontSize: "var(--fs-small)" },
});

/** The muted line under a reply for each tool the assistant used, so the organizer can see it working. */
export const ToolLine = styled("small")({ color: "var(--text-2)", fontSize: "var(--fs-small)" });

export const Card = styled("div")({
  display: "grid",
  gap: "var(--s-2)",
  padding: "var(--s-3)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
  "& blockquote": { whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
});

export const Row = styled("div")({ display: "flex", flexWrap: "wrap", gap: "var(--s-2)" });

export const Ask = styled("form")({
  display: "flex",
  gap: "var(--s-2)",
  "& input": {
    flex: 1,
    minWidth: 0,
    padding: "var(--s-2) var(--s-3)",
    border: "1px solid var(--line)",
    background: "var(--bg)",
    color: "var(--text)",
    font: "inherit",
    [COARSE]: { minHeight: TOUCH_TARGET },
  },
});
