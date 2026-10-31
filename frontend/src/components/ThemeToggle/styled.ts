"use client";

import { styled } from "@mui/material/styles";
import { HOVER } from "@/theme/media";

/** Sits on the sun footer in both themes, so it is black on orange rather than theme colours. */
export const Toggle = styled("button")({
  minHeight: "2.25rem",
  padding: "0 var(--s-3)",
  border: "1px solid #000",
  background: "transparent",
  color: "#000",
  fontWeight: 500,
  cursor: "pointer",
  transition: "background-color var(--d-2) var(--ease-out-quad), transform var(--d-3) var(--ease-out-expo)",
  [HOVER]: { "&:hover": { background: "rgba(255, 255, 255, 0.3)", boxShadow: "inset 0 0 0 1px #000" } },
  "&:active": { transform: "scale(0.96)", transitionDuration: "var(--d-press)" },
});
