"use client";

import { styled } from "@mui/material/styles";

export const Root = styled("section")({
  paddingBlock: "var(--s-7)",
  "& h1": { fontSize: "2rem", fontWeight: 500, letterSpacing: "-0.01em" },
});

export const Actions = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--s-3)",
  marginTop: "var(--s-4)",
  "& p": { flexBasis: "100%", color: "var(--text-2)" },
});
