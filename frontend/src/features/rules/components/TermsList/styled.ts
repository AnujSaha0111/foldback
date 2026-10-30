"use client";

import { styled } from "@mui/material/styles";

export const Intro = styled("p")({ marginBottom: "var(--s-3)", color: "var(--text-2)" });

export const List = styled("dl")({ margin: 0, borderTop: "1px solid var(--line-strong)" });

/** Rows rise in one after another; the one under the pointer highlights at once and fades out. */
export const Row = styled("div")({
  display: "grid",
  gap: "var(--s-1)",
  padding: "var(--s-4) var(--s-2)",
  marginInline: "calc(var(--s-2) * -1)",
  borderBottom: "1px solid var(--line-soft)",
  transition: "background-color 150ms var(--ease-out-quad)",
  animation: "fb-rise var(--d-3) var(--ease-out-expo) both",
  "&:hover": { background: "var(--layer-selected)", transitionDuration: "0ms" },
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((n) => [`&:nth-of-type(${n})`, { animationDelay: `${(n - 1) * 60}ms` }]),
  ),
  "@media (min-width: 600px)": { gridTemplateColumns: "11rem minmax(0, 1fr)", gap: "var(--s-4)" },
  "& dt": { fontSize: "var(--fs-small)", color: "var(--text-2)" },
  "& dd": { margin: 0 },
});

export const Quote = styled("span")({
  display: "block",
  marginTop: "var(--s-1)",
  fontSize: "var(--fs-small)",
  color: "var(--text-2)",
});

export const Chips = styled("div")({ display: "flex", flexWrap: "wrap", gap: "var(--s-2)" });

export const Chip = styled("span")({
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--s-2)",
  height: "1.875rem",
  padding: "0 0.625rem 0 0.375rem",
  borderRadius: "var(--r-tag)",
  background: "var(--layer)",
  fontSize: "var(--fs-small)",
});

/** The person's initial in a sky square with the logo's fold. */
export const Initial = styled("span")({
  display: "grid",
  placeItems: "center",
  width: "1.125rem",
  height: "1.125rem",
  background: "var(--sky)",
  color: "#000",
  fontSize: "0.6875rem",
  fontWeight: 600,
  clipPath: "polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 0 100%)",
});

export const Confirm = styled("div")({
  marginTop: "var(--s-5)",
  "& > p:last-child": {
    maxWidth: "34rem",
    marginTop: "var(--s-3)",
    fontSize: "var(--fs-small)",
    color: "var(--text-2)",
  },
});
