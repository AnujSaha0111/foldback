"use client";

import { styled } from "@mui/material/styles";

const WIDE = "@media (min-width: 900px)";

export const Root = styled("div")({
  display: "grid",
  minHeight: "100dvh",
  [WIDE]: { gridTemplateColumns: "minmax(0, 34rem) minmax(0, 1fr)" },
});

export const Column = styled("div")({
  width: "100%",
  maxWidth: "32rem",
  padding: "var(--s-4) var(--gutter)",
  animation: "fb-rise var(--d-5) var(--ease-out-quart) both",
  "& h1": { marginBottom: "var(--s-1)", fontSize: "clamp(1.75rem, 1.4rem + 1vw, 2.25rem)" },
  [WIDE]: { paddingInline: "var(--s-8)" },
});

export const Switch = styled("p")({ color: "var(--text-2)" });

export const Top = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "var(--s-4)",
});

export const Fields = styled("form")({
  marginTop: "var(--s-4)",
  "& > button": { marginTop: "var(--s-4)", minHeight: "3rem" },
});

export const Or = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: "var(--s-3)",
  margin: "var(--s-3) 0",
  fontSize: "var(--fs-small)",
  color: "var(--text-2)",
  "&::before, &::after": { content: '""', flex: 1, height: "1px", background: "var(--line)" },
});

export const Note = styled("p")({
  marginTop: "var(--s-3)",
  fontSize: "var(--fs-caption)",
  color: "var(--text-2)",
});

/** Sky with soft light; the squares drop in, the open one in orange. */
export const Panel = styled("aside")({
  display: "none",
  padding: "clamp(1.5rem, 3vw, 3rem)",
  background: "var(--field-sky)",
  color: "var(--on-sky)",
  [WIDE]: { display: "flex", flexDirection: "column" },
});

/** A frosted card from the product itself, not an illustration: the sample plan as a friend would see it. */
export const Card = styled("div")({
  maxWidth: "26rem",
  marginTop: "auto",
  padding: "var(--s-5)",
  border: "1px solid var(--glass-line)",
  borderRadius: "var(--r-panel)",
  background: "var(--glass-bg)",
  WebkitBackdropFilter: "var(--glass-blur)",
  backdropFilter: "var(--glass-blur)",
  boxShadow: "var(--glass-shine), var(--shadow-3)",
  color: "var(--text)",
  animation: "fb-rise var(--d-5) var(--ease-out-quart) 400ms both",
  "& > p": { marginBlock: "var(--s-3)", fontSize: "1.0625rem", lineHeight: 1.45 },
});

export const CardHead = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: "var(--fs-small)",
  fontWeight: 500,
});

export const CardSum = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: "var(--s-3)",
  fontFamily: "var(--font-mono)",
  fontSize: "0.8125rem",
  color: "var(--text-2)",
  "& span": { display: "inline-flex", gap: "3px" },
  "& i": { width: "10px", height: "10px", background: "var(--blue)" },
  "& i:last-of-type": { background: "transparent", boxShadow: "inset 0 0 0 2px var(--sun)" },
});

export const PanelTitle = styled("p")({
  maxWidth: "11ch",
  fontSize: "clamp(2.75rem, 1.5rem + 3vw, 4.25rem)",
  fontWeight: 600,
  letterSpacing: "-0.04em",
  lineHeight: 1.02,
});

export const Mark = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(2, 5rem)",
  gap: "0.5rem",
  marginTop: "var(--s-5)",
  marginBottom: "var(--s-5)",
  "& i": {
    display: "block",
    width: "5rem",
    height: "5rem",
    background: "var(--navy)",
    clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)",
    animation: "fb-pop 800ms var(--ease-out-expo) both",
  },
  "& i:nth-of-type(2)": { animationDelay: "90ms" },
  "& i:nth-of-type(3)": { animationDelay: "180ms" },
  "& i:last-of-type": {
    animationDelay: "270ms",
    clipPath: "none",
    background: "transparent",
    boxShadow: "inset 0 0 0 4px var(--sun)",
  },
});
