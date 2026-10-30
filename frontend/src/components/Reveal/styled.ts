"use client";

import { styled } from "@mui/material/styles";

export const Root = styled("div")({
  opacity: 0,
  transform: "translateY(16px)",
  transition: "opacity 400ms var(--ease), transform 400ms var(--ease)",
  "&[data-in='true']": { opacity: 1, transform: "none" },
  "@media (prefers-reduced-motion: reduce)": { opacity: 1, transform: "none", transition: "none" },
});
