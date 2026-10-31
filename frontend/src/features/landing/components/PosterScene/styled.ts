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
const NARROW = "@media (max-width: 899px)";

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
  [NARROW]: { paddingBottom: "4svh" },
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
  // Half the phone's width plus a gap. "hold" slides in from the left and comes to rest just left of the phone,
  // never behind it: white on the phone's light screen would vanish.
  "--half": "calc(9.125 * min(1rem, 1.8svh) + 1rem)",
  transform: "translateX(calc(-100% - var(--half) - (1 - var(--q)) * 45vw))",
  // No room beside the phone: "hold" rests centered above it, under the header.
  [NARROW]: {
    top: "calc(var(--header-h) + var(--s-1))",
    transform: "translateX(calc(-50% - (1 - var(--q)) * 45vw))",
  },
});

export const WordB = styled(Word)({
  // The gradient is clipped to the text box. This padding gives the tails of "p" and "y" room inside it, and
  // the matching `bottom` keeps the word where it was.
  paddingBottom: "0.22em",
  paddingRight: "0.1em",
  bottom: "calc(10% - 0.22em)",
  zIndex: 2,
  backgroundImage: "var(--sun-grad)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  transform: "translateX(calc(-5% - var(--q) * 55%))",
  // Clears the two lines at the foot, and rests centered.
  [NARROW]: {
    bottom: "calc(7.5rem - 0.22em)",
    transform: "translateX(calc(-50% + (1 - var(--q)) * 45%))",
  },
});

/**
 * A line beside the phone, mid-height between the two big words. It fades and rises in as the phone turns. Narrow
 * screens have no room beside the phone, so the two lines sit side by side at the foot, still left and right.
 */
const Side = styled("p")({
  "--edge": "clamp(1rem, 4vw, 5rem)",
  position: "absolute",
  top: "44%",
  zIndex: 3,
  maxWidth: "min(22rem, 26vw)",
  fontSize: "1.0625rem",
  lineHeight: 1.4,
  opacity: "calc(var(--q) * 1.6 - 0.4)",
  transform: "translateY(calc((1 - var(--q)) * 16px))",
  [NARROW]: {
    top: "auto",
    bottom: "var(--s-3)",
    maxWidth: "calc(50% - var(--edge) - var(--s-2))",
    fontSize: "var(--fs-small)",
  },
});

export const Caption = styled(Side)({
  left: "var(--edge)",
  color: "rgba(255, 255, 255, 0.86)",
});

/** The other side, in the sun colour: what happens to the holds. */
export const Outcome = styled(Side)({
  right: "var(--edge)",
  textAlign: "right",
  color: "var(--sun)",
});
