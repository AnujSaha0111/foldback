"use client";

import { styled } from "@mui/material/styles";
import { SHIMMER } from "@/components/Skeleton/styled";
import { HOVER } from "@/theme/media";

export const Head = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "var(--s-5)",
  marginBottom: "var(--s-6)",
  "& p": { marginTop: "var(--s-2)", color: "var(--text-2)" },
});

/** Where the organizer is: Paste, Read, Confirm, Share links. */
export const Flow = styled("ol")({
  display: "flex",
  gap: "2px",
  fontSize: "0.8125rem",
  "& li": {
    display: "flex",
    alignItems: "center",
    gap: "var(--s-2)",
    height: "2rem",
    padding: "0 var(--s-3) 0 0.625rem",
    background: "var(--layer)",
    color: "var(--text-2)",
    transition: "background-color var(--d-3) var(--ease-out-quad), color var(--d-3) var(--ease-out-quad)",
  },
  "& b": { fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "0.75rem" },
  "& li[data-state='done']": { background: "var(--blue-50)", color: "var(--link)" },
  "& li[aria-current='step']": { background: "var(--btn-bg)", color: "var(--btn-fg)" },
  "@media (max-width: 599px)": { "& li span": { display: "none" } },
});

export const Grid = styled("div")({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "var(--s-5)",
  alignItems: "start",
  "@media (min-width: 1024px)": { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "var(--s-6)" },
});

/** A working surface: white, a hairline, soft navy-tinted depth. */
export const Panel = styled("section", { shouldForwardProp: (prop) => prop !== "$raised" })<{
  $raised?: boolean;
}>(({ $raised }) => ({
  minWidth: 0,
  padding: "var(--s-5)",
  background: "var(--bg)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
  boxShadow: $raised ? "var(--shadow-3)" : "var(--shadow-2)",
  "@media (min-width: 1024px)": $raised ? { position: "sticky", top: "5.25rem" } : {},
}));

export const Actions = styled("div")({ marginTop: "var(--s-4)" });

/** Under the box: the sample link on the left, a live character count on the right. */
export const Tools = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--s-3)",
  marginTop: "var(--s-4)",
});

export const SampleLink = styled("button")({
  position: "relative",
  padding: "1px 0",
  border: 0,
  background: "linear-gradient(currentColor, currentColor) 0 100% / 0 1px no-repeat",
  color: "var(--link)",
  font: "inherit",
  fontSize: "0.9375rem",
  fontWeight: 500,
  cursor: "pointer",
  transition: "background-size var(--d-3) var(--ease-out-quart)",
  [HOVER]: { "&:hover": { backgroundSize: "100% 1px" } },
  // The text is 24 px tall; the target reaches 44 px without moving the underline.
  "&::after": { content: '""', position: "absolute", inset: "-10px -4px" },
});

export const Count = styled("span")({
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums",
  fontSize: "0.75rem",
  color: "var(--text-3)",
});

export const Muted = styled("p")({ color: "var(--text-2)" });

/** Before anything is read: the four-square mark, the last square in orange, and one sentence. */
export const Empty = styled("div")({
  display: "grid",
  justifyItems: "start",
  gap: "var(--s-3)",
  padding: "var(--s-5) 0",
  "& > p:first-of-type": { fontSize: "var(--fs-h3)", fontWeight: 500 },
  "& > p": { maxWidth: "26rem" },
});

export const Glyph = styled("span")({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1.375rem)",
  gap: "5px",
  marginBottom: "var(--s-1)",
  "& i": { aspectRatio: "1", boxShadow: "inset 0 0 0 1.5px var(--text-3)" },
  "& i:last-child": { boxShadow: "inset 0 0 0 1.5px var(--sun)" },
});

/** Reading: the layout of the result is known, so a skeleton holds its place. */
export const Skeleton = styled("div")({
  display: "grid",
  gap: "var(--s-5)",
  marginTop: "var(--s-5)",
  "& i": {
    display: "block",
    height: "12px",
    borderRadius: "2px",
    ...SHIMMER,
  },
  "& i:nth-of-type(odd)": { width: "70%" },
  "& i:nth-of-type(3n)": { width: "45%", height: "18px" },
});

export const Loader = styled("span")({
  display: "inline-flex",
  gap: "4px",
  marginRight: "var(--s-3)",
  verticalAlign: "1px",
  color: "var(--blue)",
  "& i": {
    width: "8px",
    height: "8px",
    background: "currentColor",
    opacity: 0.2,
    animation: "fb-squares 1.2s ease-in-out infinite",
  },
  "& i:nth-of-type(2)": { animationDelay: "0.15s" },
  "& i:nth-of-type(3)": { animationDelay: "0.3s" },
  "& i:nth-of-type(4)": { animationDelay: "0.45s" },
});
