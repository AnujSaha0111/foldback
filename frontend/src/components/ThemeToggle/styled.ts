"use client";

import { styled } from "@mui/material/styles";

/** Sits on the navy footer in both themes, so it is white on navy rather than theme colours. */
export const Toggle = styled("button")({
  minHeight: "2.25rem",
  padding: "0 var(--s-3)",
  border: "1px solid var(--paper)",
  background: "transparent",
  color: "var(--paper)",
  cursor: "pointer",
  transition: "background-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease)",
  "&:hover": { background: "var(--paper)", color: "var(--navy)" },
});
