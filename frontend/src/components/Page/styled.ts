"use client";

import { styled } from "@mui/material/styles";
import type { CSSObject } from "@mui/material/styles";

export const Shell = styled("div")({
  display: "flex",
  flexDirection: "column",
  minHeight: "100dvh",
  background: "var(--field-app)",
  color: "var(--text)",
});

export const Main = styled("main")({ flex: 1 });

export const Skip = styled("a")({
  position: "absolute",
  left: "var(--s-2)",
  top: "-4rem",
  zIndex: 50,
  padding: "var(--s-3) var(--s-4)",
  background: "var(--btn-bg)",
  color: "var(--btn-fg)",
  "&:focus": { top: "var(--s-2)" },
});

/** Content column. Sections that want a full-width colour band wrap their own `Inner` in a band. */
export const Inner = styled("div")({
  width: "100%",
  maxWidth: "80rem",
  marginInline: "auto",
  paddingLeft: "var(--gutter-l)",
  paddingRight: "var(--gutter-r)",
});

/**
 * Black controls on a sky band, in both themes. Sky stays sky in dark mode, so the tokens are set back to their light
 * values inside it, and the buttons need no special case.
 */
export const onSky: CSSObject = {
  color: "var(--on-sky)",
  "--text": "var(--ink)",
  "--bg": "var(--paper)",
  "--link": "var(--ink)",
  "--btn-bg": "var(--ink)",
  "--btn-fg": "var(--paper)",
  "--btn-hover": "#393939",
  "--text-2": "#525252",
  "--text-3": "#6f6f6f",
  "--line": "#e0e0e0",
  "--glass-bg": "rgba(255, 255, 255, 0.62)",
  "--glass-line": "rgba(255, 255, 255, 0.72)",
  "& [data-variant='link']": { paddingInline: "var(--s-2)", textDecoration: "underline" },
};
