"use client";

import { styled } from "@mui/material/styles";
import type { CSSObject } from "@mui/material/styles";

/** A soft sweep in the text colour, so a shape reads on white, on dark and on the sky band alike. */
export const SHIMMER: CSSObject = {
  background: [
    "linear-gradient(90deg,",
    "color-mix(in srgb, currentColor 7%, transparent) 0%,",
    "color-mix(in srgb, currentColor 14%, transparent) 40%,",
    "color-mix(in srgb, currentColor 7%, transparent) 80%) 0 0 / 300% 100%",
  ].join(" "),
  animation: "fb-shimmer 1.4s linear infinite",
};

interface BoneProps {
  $w?: string;
  $h?: string;
}

/** One placeholder shape, sized like the content it stands for. */
export const Bone = styled("span", {
  shouldForwardProp: (prop) => prop !== "$w" && prop !== "$h",
})<BoneProps>(({ $w = "100%", $h = "0.875rem" }) => ({
  display: "block",
  flex: "none",
  width: $w,
  maxWidth: "100%",
  height: $h,
  borderRadius: "2px",
  ...SHIMMER,
}));

/** Shapes stacked with a gap, as the real content is. */
export const Stack = styled("div", { shouldForwardProp: (prop) => prop !== "$gap" })<{ $gap?: string }>(
  ({ $gap = "var(--s-3)" }) => ({ display: "grid", gap: $gap }),
);
