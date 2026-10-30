"use client";

import { styled } from "@mui/material/styles";
import { Inner } from "@/components/Page/styled";
import { ScrollScene } from "@/components/ScrollScene";

/** Scroll scene 2: four squares slide in from four sides and lock into a grid. The fourth stays open. */
export const Root = styled(ScrollScene)({
  "--p": 0.6,
  "--q": "clamp(0, calc((var(--p) - 0.15) / 0.4), 1)",
  "--sq": "var(--navy)",
  position: "relative",
  overflow: "hidden",
  paddingBlock: "var(--s-8)",
  background: "var(--warm)",
  "[data-theme='dark'] &": { background: "#1b1714", "--sq": "var(--link)" },
});

export const Wrap = styled(Inner)({
  display: "grid",
  gap: "var(--s-6)",
  alignItems: "center",
  "@media (min-width: 768px)": {
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "var(--s-8)",
  },
});

export const Count = styled("p")({
  marginTop: "var(--s-4)",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--fs-small)",
});

export const Art = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "0.75rem",
  width: "min(100%, 22rem)",
  aspectRatio: "1",
  "@media (min-width: 768px)": { justifySelf: "end" },
  "& i": {
    display: "block",
    background: "var(--sq)",
    opacity: "calc(0.15 + 0.85 * var(--q))",
    transform: "translate(calc((1 - var(--q)) * var(--x)), calc((1 - var(--q)) * var(--y)))",
  },
  "& i:nth-of-type(1)": { "--x": "-60vw", "--y": "-30vh" },
  "& i:nth-of-type(2)": { "--x": "60vw", "--y": "-40vh" },
  "& i:nth-of-type(3)": { "--x": "-50vw", "--y": "40vh" },
  "& i:nth-of-type(4)": {
    "--x": "60vw",
    "--y": "30vh",
    background: "transparent",
    boxShadow: "inset 0 0 0 4px var(--sun), 0 0 40px -6px rgba(255, 122, 26, 0.45)",
  },
});
