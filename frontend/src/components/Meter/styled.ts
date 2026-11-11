"use client";

import { styled } from "@mui/material/styles";

/** A thin progress bar. Its `<i>` fills to `--v` (0 to 1) and slides there when the value changes. */
export const Meter = styled("div")({
  height: "4px",
  background: "var(--layer-hover)",
  "& > i": {
    display: "block",
    height: "100%",
    background: "var(--blue)",
    transformOrigin: "0 50%",
    transform: "scaleX(var(--v))",
    transition: "transform var(--d-5) var(--ease-out-quart)",
  },
});
