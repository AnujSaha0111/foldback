"use client";

import { styled } from "@mui/material/styles";

export const Root = styled("footer")({
  borderTop: "1px solid var(--line)",
  background: "var(--layer)",
  color: "var(--text-2)",
  fontSize: "var(--fs-small)",
});

export const Row = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--s-4)",
  minHeight: "4rem",
  paddingBlock: "var(--s-3)",
});
