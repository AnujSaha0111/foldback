"use client";

import { styled } from "@mui/material/styles";

export const Item = styled("li")({
  display: "grid",
  gridTemplateColumns: "3rem minmax(0, 1fr)",
  gap: "var(--s-3)",
  padding: "var(--s-4) 0",
  borderTop: "1px solid var(--line)",
  "&:first-of-type": { borderTopColor: "var(--line-strong)" },
});

export const Mark = styled("span")({
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums",
  color: "var(--text-2)",
});

export const Body = styled("p")({ color: "var(--text-2)" });
