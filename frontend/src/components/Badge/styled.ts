"use client";

import { styled } from "@mui/material/styles";

export const Root = styled("span")({
  display: "inline-flex",
  alignItems: "center",
  height: "1.375rem",
  padding: "0 var(--s-2)",
  border: "1px solid var(--text-3)",
  borderRadius: "var(--r-tag)",
  color: "var(--text-2)",
  fontSize: "var(--fs-caption)",
  fontWeight: 500,
  lineHeight: 1,
  whiteSpace: "nowrap",
});
