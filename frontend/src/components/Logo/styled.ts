"use client";

import { styled } from "@mui/material/styles";

/**
 * The logo is two blocks, each with a folded corner, drawn in CSS so it scales with font-size and follows the theme
 * tokens. `Fold` is black on sky with the fold top right. `back` is white on black with the fold bottom right.
 */
export const Root = styled("span")({
  display: "inline-flex",
  fontSize: "1.25rem",
  fontWeight: 600,
  letterSpacing: "-0.04em",
  lineHeight: "1.6em",
  whiteSpace: "nowrap",
});

const Block = styled("span")({
  position: "relative",
  display: "inline-block",
  height: "1.6em",
  "& > i": { position: "absolute", right: 0, width: "0.3em", height: "0.3em" },
});

export const Fold = styled(Block)({
  padding: "0 0.1em 0 0.42em",
  background: "var(--logo-a-bg)",
  color: "var(--logo-a-fg)",
  clipPath: "polygon(0 0, calc(100% - 0.3em) 0, 100% 0.3em, 100% 100%, 0 100%)",
  "& > i": { top: 0, background: "var(--logo-a-flap)", clipPath: "polygon(0 0, 0 100%, 100% 100%)" },
});

export const Back = styled(Block)({
  padding: "0 0.42em 0 0.1em",
  background: "var(--logo-b-bg)",
  color: "var(--logo-b-fg)",
  clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 0.3em), calc(100% - 0.3em) 100%, 0 100%)",
  "& > i": { bottom: 0, background: "var(--logo-b-flap)", clipPath: "polygon(0 0, 100% 0, 0 100%)" },
});
