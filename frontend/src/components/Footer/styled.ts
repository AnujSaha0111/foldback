"use client";

import { styled } from "@mui/material/styles";

export const Root = styled("footer")({
  background: "var(--navy)",
  color: "var(--paper)",
  fontSize: "var(--fs-small)",
});

export const Row = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--s-4) var(--s-5)",
  paddingBlock: "var(--s-5)",
});

export const Note = styled("span")({ flex: "1 1 12rem" });
