"use client";

import { styled } from "@mui/material/styles";

/** Money, ids and times are mono with tabular numerals, so columns of figures line up. */
export const Mono = styled("span")({
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums",
});
