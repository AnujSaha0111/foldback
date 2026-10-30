"use client";

import { styled } from "@mui/material/styles";
import { ScrollScene } from "@/components/ScrollScene";

/** Scroll scene 1: big words slide across an illustrated phone. `--p` comes from useScrollProgress. */
export const Root = styled(ScrollScene)({
  "--p": 0.6,
  position: "relative",
  display: "grid",
  placeItems: "center",
  minHeight: "clamp(32rem, 92vh, 52rem)",
  overflow: "hidden",
  background: "var(--navy)",
  color: "var(--paper)",
});

export const Art = styled("div")({
  position: "relative",
  zIndex: 1,
  width: "min(17rem, 60vw)",
  transform: "translateY(calc((0.5 - var(--p)) * 140px))",
});

export const Words = styled("h2")({
  position: "absolute",
  inset: 0,
  zIndex: 2,
  pointerEvents: "none",
});

const Word = styled("span")({
  position: "absolute",
  left: 0,
  right: 0,
  fontSize: "clamp(4rem, 15vw, 13rem)",
  fontWeight: 600,
  letterSpacing: "-0.06em",
  lineHeight: 0.85,
  textAlign: "center",
  whiteSpace: "nowrap",
});

export const WordA = styled(Word)({
  top: "12%",
  color: "var(--paper)",
  transform: "translateX(calc((var(--p) - 0.5) * 36vw))",
});

export const WordB = styled(Word)({
  bottom: "12%",
  color: "var(--sky)",
  transform: "translateX(calc((0.5 - var(--p)) * 36vw))",
});
