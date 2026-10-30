"use client";

import { styled } from "@mui/material/styles";

export const Shell = styled("div")({
  display: "flex",
  flexDirection: "column",
  minHeight: "100dvh",
  background: "var(--bg)",
  color: "var(--text)",
});

export const Main = styled("main")({ flex: 1 });

/** Content column. Sections that want a full-width colour band wrap their own `Inner` in a band. */
export const Inner = styled("div")({
  width: "100%",
  maxWidth: "82rem",
  marginInline: "auto",
  paddingInline: "var(--gutter)",
});
