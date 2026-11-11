"use client";

import { styled } from "@mui/material/styles";

export const User = styled("span")({
  display: "inline-flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--s-2)",
  fontSize: "var(--fs-small)",
  color: "var(--text)",
});

/** The plan's name after "Plans", with a slash between them, as a breadcrumb. */
export const Crumb = styled("span")({
  display: "flex",
  alignItems: "center",
  gap: "var(--s-2)",
  padding: "var(--s-2) 0",
  fontWeight: 500,
  "&::before": { content: '"/"', color: "var(--text-3)", fontWeight: 400 },
  "@media (min-width: 900px)": { marginLeft: "calc(var(--s-6) * -0.6)" },
});
