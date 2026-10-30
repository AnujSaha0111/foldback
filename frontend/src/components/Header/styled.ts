"use client";

import { styled } from "@mui/material/styles";
import { Inner } from "@/components/Page/styled";

/** Frosted and pinned, so the logo's sky block always has a light ground and the nav stays through every scene. */
export const Root = styled("header")({
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: "var(--glass-nav)",
  WebkitBackdropFilter: "var(--glass-blur)",
  backdropFilter: "var(--glass-blur)",
  borderBottom: "1px solid var(--line-soft)",
});

export const Bar = styled(Inner)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--s-4)",
  minHeight: "3.5rem",
  "@media (min-width: 900px)": { minHeight: "4rem" },
});
