"use client";

import { styled } from "@mui/material/styles";

export const Root = styled("span")({
  display: "inline-block",
  padding: "calc(0.2rem - 1px) 0.55rem",
  border: "1px solid var(--text-2)",
  color: "var(--text-2)",
  fontSize: "var(--fs-caption)",
  fontWeight: 500,
  lineHeight: 1.3,
  whiteSpace: "nowrap",
});
