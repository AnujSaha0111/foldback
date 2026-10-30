"use client";

import { styled } from "@mui/material/styles";
import { ScrollScene } from "@/components/ScrollScene";

/**
 * Scroll scene 1: the phone turns to face you while "hold" and "don't pay" slide past it, and the last hold lands on
 * its screen. The section is 230vh with a sticky stage; `--p` (0 → 1 over the whole section) is remapped to `--q`
 * (0 → 1 while the stage is pinned). Without JS or under reduced motion `--p` stays at its default and the scene rests
 * in its composed, held state.
 */
export const Root = styled(ScrollScene)({
  "--p": 0.75,
  "--q": "clamp(0, calc((var(--p) - 0.3) / 0.4), 1)",
  // 0 until the phone is nearly flat, then 1: the moment Maya's hold lands.
  "--held": "clamp(0, calc((var(--q) - 0.62) * 40), 1)",
  position: "relative",
  height: "230vh",
  background:
    "radial-gradient(50% 60% at 50% 40%, rgba(27, 69, 163, 0.85) 0%, transparent 70%), radial-gradient(40% 40% at 50% 100%, rgba(255, 122, 26, 0.22) 0%, transparent 70%), var(--navy-900)",
  color: "var(--paper)",
  "@media (max-width: 599px)": { height: "180vh" },
});

export const Stage = styled("div")({
  position: "sticky",
  top: 0,
  height: "100svh",
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
});

export const Words = styled("h2")({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
});

const Word = styled("span")({
  position: "absolute",
  left: "50%",
  fontSize: "clamp(5rem, 2rem + 16vw, 17rem)",
  fontWeight: 600,
  letterSpacing: "-0.06em",
  lineHeight: 0.8,
  whiteSpace: "nowrap",
  willChange: "transform",
});

export const WordA = styled(Word)({
  top: "14%",
  color: "var(--paper)",
  transform: "translateX(calc(-95% + var(--q) * 55%))",
});

export const WordB = styled(Word)({
  bottom: "10%",
  zIndex: 2,
  backgroundImage: "var(--sun-grad)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  transform: "translateX(calc(-5% - var(--q) * 55%))",
});

export const Caption = styled("p")({
  position: "absolute",
  left: 0,
  right: 0,
  bottom: "4%",
  zIndex: 3,
  paddingInline: "var(--gutter)",
  textAlign: "center",
  fontSize: "var(--fs-small)",
  color: "rgba(255, 255, 255, 0.72)",
  opacity: "calc(var(--q) * 1.6 - 0.4)",
});
