"use client";

import { styled } from "@mui/material/styles";

export const Title = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--s-3)",
  marginBottom: "var(--s-4)",
});

export const Note = styled("p")({ marginBlock: "var(--s-4)", color: "var(--text-2)" });
