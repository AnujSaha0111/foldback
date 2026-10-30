"use client";

import { styled } from "@mui/material/styles";

/** A slow rise with a little blur, decelerating hard, the way production sites reveal content. */
export const Root = styled("div")({
  opacity: 0,
  transform: "translateY(18px)",
  filter: "blur(6px)",
  transition:
    "opacity var(--d-5) var(--ease-out-quart), transform var(--d-6) var(--ease-out-quart), filter var(--d-5) var(--ease-out-quart)",
  "&[data-in='true']": { opacity: 1, transform: "none", filter: "none" },
  "@media (prefers-reduced-motion: reduce)": {
    opacity: 1,
    transform: "none",
    filter: "none",
    transition: "none",
  },
});
