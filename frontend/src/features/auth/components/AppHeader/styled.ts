"use client";

import { styled } from "@mui/material/styles";

export const Tagline = styled("span")({
  display: "none",
  flex: "0 0 auto",
  marginLeft: "var(--s-5)",
  fontSize: "var(--fs-small)",
  color: "var(--text-2)",
  "@media (min-width: 1200px)": { display: "block" },
});

export const User = styled("span")({
  display: "inline-flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--s-2)",
  fontSize: "var(--fs-small)",
  color: "var(--text-2)",
});
