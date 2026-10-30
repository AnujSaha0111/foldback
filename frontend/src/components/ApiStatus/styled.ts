"use client";

import { styled } from "@mui/material/styles";

export const Line = styled("p")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--s-3)",
  margin: 0,
  fontSize: "var(--fs-small)",
  color: "var(--on-sky)",
});

export const Detail = styled("span")({ fontFamily: "var(--font-mono)", fontSize: "var(--fs-caption)" });
