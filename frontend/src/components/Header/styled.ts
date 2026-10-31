"use client";

import { styled } from "@mui/material/styles";

/** Pinned and see-through, with `Bar` floating inside it. Clicks in the gap around the bar reach the page. */
export const Root = styled("header")({
  position: "sticky",
  top: 0,
  zIndex: 20,
  height: "var(--header-h)",
  paddingTop: "var(--s-3)",
  pointerEvents: "none",
});

/** Frosted, so the logo's sky block always has a light ground and the nav stays through every scene. */
export const Bar = styled("div")({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--s-4)",
  height: "calc(var(--header-h) - var(--s-3))",
  paddingInline: "var(--s-4)",
  background: "var(--glass-nav)",
  WebkitBackdropFilter: "var(--glass-blur)",
  backdropFilter: "var(--glass-blur)",
  border: "1px solid var(--line-soft)",
  borderRadius: "var(--r-panel)",
  boxShadow: "var(--shadow-2)",
  pointerEvents: "auto",
});
