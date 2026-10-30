"use client";

import { styled } from "@mui/material/styles";
import { ScrollScene } from "@/components/ScrollScene";

/**
 * Scroll scene 1: the phone turns to face you while "hold" and "don't pay" slide past it, and the last hold lands on
 * its screen. The section is 230vh with a sticky stage; `--p` (0 when the top edge enters the screen, 1 when the
 * bottom edge leaves it, pinned from about 0.3 to 0.7) is remapped to `--q`. `--q` starts as soon as the scene
 * peeks in (p 0.08) and is done a little before the stage unpins (p 0.58). Without JS or under reduced motion `--p`
 * stays at its default and the scene rests in its composed, held state.
 */
export const Root = styled(ScrollScene)({
  "--p": 0.75,
  "--q": "clamp(0, calc((var(--p) - 0.08) / 0.5), 1)",
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
  // Keeps the phone above the caption line instead of centered over it.
  paddingBottom: "9svh",
});

export const Words = styled("h2")({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
});

const Word = styled("span")({
  position: "absolute",
  left: "50%",
  fontSize: "clamp(3.5rem, 1.5rem + 11vw, 11.5rem)",
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
  // The gradient is clipped to the text box. This padding gives the tails of "p" and "y" room inside it, and
  // the matching `bottom` keeps the word where it was.
  paddingBottom: "0.22em",
  bottom: "calc(10% - 0.22em)",
  zIndex: 2,
  backgroundImage: "var(--sun-grad)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  transform: "translateX(calc(-5% - var(--q) * 55%))",
});

/** A line beside the phone, mid-height between the two big words. It fades and rises in as the phone turns. */
const Side = styled("p")({
  position: "absolute",
  top: "44%",
  zIndex: 3,
  maxWidth: "min(22rem, 26vw)",
  lineHeight: 1.4,
  opacity: "calc(var(--q) * 1.6 - 0.4)",
  transform: "translateY(calc((1 - var(--q)) * 16px))",
  // Narrow screens have no room beside the phone: the line moves to the foot on a dark chip, and the other is dropped.
  "@media (max-width: 899px)": { display: "none" },
});

export const Caption = styled(Side)({
  left: "clamp(1rem, 4vw, 5rem)",
  fontSize: "1.0625rem",
  color: "rgba(255, 255, 255, 0.86)",
  "@media (max-width: 899px)": {
    display: "block",
    top: "auto",
    bottom: "3%",
    left: "50%",
    width: "max-content",
    maxWidth: "min(36rem, calc(100% - 2 * var(--gutter)))",
    padding: "0.5rem 1rem",
    transform: "translateX(-50%)",
    textAlign: "center",
    fontSize: "var(--fs-small)",
    color: "#fff",
    background: "rgba(2, 17, 66, 0.82)",
    backdropFilter: "blur(10px)",
  },
});

/** The other side, in the sun colour: what happens to the holds. */
export const Outcome = styled(Side)({
  right: "clamp(1rem, 4vw, 5rem)",
  textAlign: "right",
  fontSize: "1.25rem",
  fontWeight: 500,
  color: "var(--sun)",
});
