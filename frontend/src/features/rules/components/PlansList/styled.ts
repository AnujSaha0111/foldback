"use client";

import { styled } from "@mui/material/styles";

export const Root = styled("section")({
  marginTop: "var(--s-8)",
  "& h2": { marginBottom: "var(--s-4)" },
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
