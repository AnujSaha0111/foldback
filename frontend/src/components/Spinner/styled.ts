"use client";

import { styled } from "@mui/material/styles";

export const Root = styled("svg")({
  flex: "none",
  width: "1.125em",
  height: "1.125em",
  fill: "var(--spin-held, currentColor)",
  animation: "fb-revolve 1.8s ease-in-out infinite",
  "& [data-open]": { fill: "none", stroke: "var(--spin-open, currentColor)", strokeWidth: 1.5 },
});

export const Page = styled("p")({
  "--spin-held": "var(--blue)",
  "--spin-open": "var(--sun)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--s-3)",
  minHeight: "10rem",
  color: "var(--text-2)",
  "& svg": { width: "1.75rem", height: "1.75rem" },
});
