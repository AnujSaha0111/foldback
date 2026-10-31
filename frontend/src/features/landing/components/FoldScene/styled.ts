"use client";

import { styled } from "@mui/material/styles";
import { HOVER } from "@/theme/media";
import { ScrollScene } from "@/components/ScrollScene";

const WIDE = "@media (min-width: 600px)";

/** Scroll scene 3: two blocks with folded corners slide together, Kept and Released. */
export const Root = styled(ScrollScene)({
  "--p": 0.6,
  "--q": "clamp(0, calc((var(--p) - 0.15) / 0.4), 1)",
  "--f": "clamp(1.5rem, 4vw, 3rem)",
  position: "relative",
  overflow: "hidden",
  paddingBlock: "clamp(2.5rem, 1.5rem + 3.5vw, 4.5rem)",
  background: "var(--field-sky)",
  color: "var(--ink)",
});

export const Head = styled("div")({
  maxWidth: "40rem",
  marginBottom: "var(--s-6)",
  "& h2": { fontSize: "var(--fs-h1)", letterSpacing: "-0.03em" },
});

export const Pair = styled("div")({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  [WIDE]: { gridTemplateColumns: "1fr 1fr" },
});

const Block = styled("div")({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  gap: "var(--s-3)",
  minHeight: "14rem",
  padding: "var(--s-5)",
  color: "var(--paper)",
  [WIDE]: { minHeight: "22rem" },
  "& p": { maxWidth: "22rem", minHeight: "3em" },
  transition: "--f var(--d-4) var(--ease-out-expo)",
  [HOVER]: { "&:hover": { "--f": "clamp(2.25rem, 6vw, 4.5rem)" } },
  "&::after": {
    content: '""',
    position: "absolute",
    right: 0,
    width: "var(--f)",
    height: "var(--f)",
    background: "var(--paper)",
  },
});

export const Kept = styled(Block)({
  backgroundImage: "var(--sun-grad)",
  color: "#000",
  clipPath: "polygon(0 0, calc(100% - var(--f)) 0, 100% var(--f), 100% 100%, 0 100%)",
  transform: "translateY(calc((1 - var(--q)) * -24vh))",
  [WIDE]: { transform: "translateX(calc((1 - var(--q)) * -40vw))" },
  "&::after": { top: 0, clipPath: "polygon(0 0, 0 100%, 100% 100%)" },
});

export const Released = styled(Block)({
  background: "var(--ink)",
  clipPath: "polygon(0 0, 100% 0, 100% calc(100% - var(--f)), calc(100% - var(--f)) 100%, 0 100%)",
  transform: "translateY(calc((1 - var(--q)) * 24vh))",
  [WIDE]: { transform: "translateX(calc((1 - var(--q)) * 40vw))" },
  "&::after": { bottom: 0, clipPath: "polygon(0 0, 100% 0, 0 100%)" },
});

export const Word = styled("span")({
  fontSize: "clamp(2.5rem, 8vw, 6rem)",
  fontWeight: 600,
  letterSpacing: "-0.05em",
  lineHeight: 0.95,
});
