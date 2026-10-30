"use client";

import { styled } from "@mui/material/styles";

export const Head = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "var(--s-2)",
  fontSize: "var(--fs-small)",
  fontWeight: 500,
});

export const Body = styled("div")({
  maxHeight: "22rem",
  overflow: "auto",
  padding: "var(--s-4)",
  background: "var(--layer)",
  fontSize: "0.9375rem",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
  "& p": { minHeight: "1em", paddingBlock: "3px" },
  overflowWrap: "anywhere",
});

/** A thin underline at rest; when its term is hovered it fills to a full highlight with a soft halo. */
export const Mark = styled("mark")({
  color: "inherit",
  padding: "0 1px",
  background: "linear-gradient(var(--sky-200), var(--sky-200)) 0 100% / 100% 30% no-repeat",
  transition: "background-size var(--d-4) var(--ease-out-expo), box-shadow var(--d-3) var(--ease-out-quad)",
  "&[data-lit='true']": { backgroundSize: "100% 100%", boxShadow: "0 0 0 2px var(--sky-200)" },
  "[data-theme='dark'] &": {
    backgroundImage: "linear-gradient(rgba(96, 205, 255, 0.35), rgba(96, 205, 255, 0.35))",
  },
});

export const Stamp = styled("span")({
  marginRight: "var(--s-2)",
  fontFamily: "var(--font-mono)",
  fontSize: "0.75rem",
  color: "var(--text-3)",
});

export const Speaker = styled("b")({ fontWeight: 500 });
