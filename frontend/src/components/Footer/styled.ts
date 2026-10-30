"use client";

import { styled } from "@mui/material/styles";

/** The one warm band: the sun gradient with a little grain, black text in both themes. */
export const Root = styled("footer")({
  position: "relative",
  backgroundImage: "var(--sun-grad)",
  color: "#000",
  fontSize: "var(--fs-small)",
  "--logo-b-bg": "#000",
  "--logo-b-fg": "#fff",
});

export const Row = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--s-4) var(--s-5)",
  paddingBlock: "var(--s-5)",
});

export const Note = styled("span")({ flex: "1 1 12rem" });
