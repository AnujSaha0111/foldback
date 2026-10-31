"use client";

import { styled } from "@mui/material/styles";
import { HOVER } from "@/theme/media";
import { Mono } from "@/components/Money/styled";

/** Frosted glass over the sky. It leans toward the cursor (JS writes --rx/--ry) and a soft light follows it. */
export const Root = styled("div")({
  "--rx": "0deg",
  "--ry": "0deg",
  "--mx": "50%",
  "--my": "50%",
  position: "relative",
  overflow: "hidden",
  color: "var(--text)",
  background: "var(--glass-bg)",
  border: "1px solid var(--glass-line)",
  borderRadius: "var(--r-panel)",
  WebkitBackdropFilter: "var(--glass-blur)",
  backdropFilter: "var(--glass-blur)",
  boxShadow: "var(--glass-shine), var(--shadow-3)",
  transform: "perspective(1400px) rotateX(var(--rx)) rotateY(var(--ry))",
  transition: "transform var(--d-6) var(--ease-out-expo)",
  animation: "fb-rise var(--d-5) var(--ease-out-quart) 280ms both",
  "&[data-tracking='true']": { transitionDuration: "160ms" },
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background:
      "radial-gradient(420px circle at var(--mx) var(--my), rgba(255, 255, 255, 0.55), transparent 45%)",
    opacity: 0,
    transition: "opacity 500ms var(--ease-out-quad)",
  },
  [HOVER]: { "&:hover::before": { opacity: 1, transitionDuration: "200ms" } },
  "& > *": { position: "relative" },
});

export const Wrap = styled("div")({ width: "100%", maxWidth: "35rem", justifySelf: "end" });

/** Under the panel: what the demo shows, and a way to watch the holds land again. */
export const Caption = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  marginTop: "var(--s-3)",
  fontSize: "var(--fs-caption)",
  color: "rgba(0, 0, 0, 0.66)",
  "& button": {
    padding: "3px 0",
    border: 0,
    background: "none",
    color: "#000",
    font: "inherit",
    fontWeight: 500,
    textDecoration: "underline",
    textDecorationColor: "rgba(0, 0, 0, 0.3)",
    textUnderlineOffset: "3px",
    cursor: "pointer",
  },
  [HOVER]: { "& button:hover": { textDecorationColor: "#000" } },
});

export const Head = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--s-2) var(--s-5)",
  padding: "var(--s-4) var(--s-5)",
  borderBottom: "1px solid rgba(1, 33, 105, 0.07)",
  "& strong": {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--s-2)",
    fontWeight: 600,
    fontSize: "0.9375rem",
  },
});

export const Small = styled("span")({ fontSize: "0.8125rem", color: "var(--text-2)" });

export const Row = styled("div")({
  display: "grid",
  gridTemplateColumns: "1.75rem minmax(0, 1fr) auto",
  gap: "var(--s-3)",
  alignItems: "center",
  padding: "var(--s-3) var(--s-5)",
  borderTop: "1px solid rgba(1, 33, 105, 0.07)",
  fontSize: "0.9375rem",
  transition: "background-color 150ms var(--ease-out-quad)",
  "&:first-of-type": { borderTop: 0 },
  [HOVER]: { "&:hover": { background: "rgba(255, 255, 255, 0.45)", transitionDuration: "0ms" } },
  "& > span:nth-of-type(2)": { fontWeight: 500 },
  // Phones keep the name and the status; every amount is the same, and the total below says it.
  "@media (max-width: 599px)": { "& > span:last-of-type": { display: "none" } },
  "@media (min-width: 600px)": { gridTemplateColumns: "1.75rem minmax(0, 1fr) auto 5.5rem" },
});

export const Amount = styled(Mono)({ textAlign: "right" });

export const Sum = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--s-2) var(--s-3)",
  padding: "var(--s-3) var(--s-5) var(--s-4)",
  background: "rgba(255, 255, 255, 0.42)",
  borderTop: "1px solid rgba(1, 33, 105, 0.07)",
  fontSize: "0.875rem",
  "& > :last-of-type": { marginLeft: "auto" },
});

/** One square per person. Held is blue; the one still open is outlined in orange, the one thing that matters. */
export const Squares = styled("span")({
  display: "inline-flex",
  gap: "4px",
  marginRight: "var(--s-2)",
  verticalAlign: "-1px",
  "& i": {
    display: "block",
    width: "12px",
    height: "12px",
    boxShadow: "inset 0 0 0 2px var(--sun)",
    transition:
      "background-color var(--d-3) var(--ease-out-quad), box-shadow var(--d-3) var(--ease-out-quad)",
  },
  "& i[data-on='true']": {
    background: "var(--blue)",
    boxShadow: "none",
    animation: "fb-pop 560ms var(--ease-spring) both",
  },
});

export const ToGo = styled("span")({
  display: "inline-flex",
  alignItems: "center",
  height: "1.375rem",
  padding: "0 var(--s-2)",
  borderRadius: "var(--r-tag)",
  backgroundImage: "var(--sun-grad)",
  color: "#000",
  fontSize: "var(--fs-caption)",
  fontWeight: 600,
});

export const Meter = styled("div")({
  gridColumn: "1 / -1",
  flexBasis: "100%",
  height: "4px",
  marginTop: "var(--s-2)",
  background: "rgba(1, 33, 105, 0.08)",
  "& > i": {
    display: "block",
    height: "100%",
    background: "var(--blue)",
    transformOrigin: "0 50%",
    transform: "scaleX(var(--v))",
    transition: "transform var(--d-5) var(--ease-out-quart)",
  },
});
