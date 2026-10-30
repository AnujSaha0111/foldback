"use client";

import { styled } from "@mui/material/styles";
import { Inner, onSky } from "@/components/Page/styled";

/** Sky with soft white light drifting behind the glass panel. No orange here: the sun is kept for the action. */
export const Root = styled("section")({
  position: "relative",
  isolation: "isolate",
  overflow: "hidden",
  background: "var(--field-sky)",
  color: "var(--on-sky)",
});

export const Light = styled("span")({
  position: "absolute",
  zIndex: -1,
  width: "46vw",
  height: "46vw",
  maxWidth: "40rem",
  maxHeight: "40rem",
  right: "-8vw",
  top: "-16vw",
  borderRadius: "50%",
  filter: "blur(60px)",
  background:
    "radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(214, 242, 255, 0.35) 32%, transparent 64%)",
  pointerEvents: "none",
  animation: "fb-drift 28s ease-in-out infinite alternate",
});

export const Grid = styled(Inner)({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "var(--s-8)",
  alignItems: "center",
  paddingBlock: "clamp(2.5rem, 1rem + 6vw, 5.5rem) clamp(3.5rem, 2rem + 6vw, 6.5rem)",
  "@media (min-width: 1024px)": { gridTemplateColumns: "minmax(0, 1.08fr) minmax(0, 1fr)" },
});

export const Copy = styled("div")(onSky);

export const Title = styled("h1")({
  maxWidth: "11ch",
  fontSize: "clamp(2.75rem, 1.6rem + 4.6vw, 5rem)",
  fontWeight: 600,
  letterSpacing: "-0.038em",
  lineHeight: 1.02,
  textWrap: "balance",
});

/** Each word rises through a mask with a little blur, one after another. */
export const Word = styled("span")({
  display: "inline-block",
  overflow: "hidden",
  verticalAlign: "top",
  paddingBottom: "0.08em",
  marginBottom: "-0.08em",
  "& > span": {
    display: "inline-block",
    animation: "fb-word 1000ms var(--ease-out-expo) both",
    animationDelay: "calc(120ms + var(--i) * 55ms)",
  },
});

const enter = (step: number) => ({
  animation: "fb-rise var(--d-5) var(--ease-out-quart) both",
  animationDelay: `${420 + step * 70}ms`,
});

export const Lead = styled("p")({
  maxWidth: "33rem",
  marginTop: "var(--s-5)",
  fontSize: "var(--fs-lead)",
  lineHeight: 1.5,
  color: "rgba(0, 0, 0, 0.78)",
  ...enter(0),
});

export const Actions = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--s-3)",
  marginTop: "var(--s-7)",
  ...enter(1),
  "& > div": { display: "contents" },
  "& button, & a": { minHeight: "3.25rem", paddingInline: "var(--s-6)", fontSize: "1rem" },
  "@media (max-width: 599px)": { "& button, & a": { flex: "1 1 100%" } },
});

export const Note = styled("p")({
  maxWidth: "36rem",
  marginTop: "var(--s-3)",
  fontSize: "var(--fs-small)",
  color: "rgba(0, 0, 0, 0.72)",
  ...enter(2),
  "& a": { color: "#000", fontWeight: 500, textDecorationColor: "rgba(0, 0, 0, 0.35)" },
  "& a:hover": { textDecorationColor: "#000" },
});

export const Trust = styled("ul")({
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--s-2) var(--s-5)",
  marginTop: "var(--s-7)",
  fontSize: "0.8125rem",
  color: "rgba(0, 0, 0, 0.78)",
  ...enter(3),
  "& li": { display: "inline-flex", alignItems: "center", gap: "var(--s-2)" },
  "& svg": { width: "15px", height: "15px", fill: "none", stroke: "currentColor", strokeWidth: 1.8 },
});
