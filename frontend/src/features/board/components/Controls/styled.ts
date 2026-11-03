"use client";

import { styled } from "@mui/material/styles";

export const Root = styled("section")({
  display: "grid",
  gap: "var(--s-3)",
  marginTop: "var(--s-1)",
  marginBottom: "var(--s-4)",
});

export const Buttons = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--s-3)",
});

/** One control and the line under it saying what it will do. */
export const Control = styled("div")({
  display: "grid",
  gap: "var(--s-1)",
  "& small": { color: "var(--text-2)", fontSize: "var(--fs-small)" },
});

export const BannerAction = styled("div")({ marginTop: "var(--s-3)" });
