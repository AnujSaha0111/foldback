"use client";

import { styled } from "@mui/material/styles";
import { Inner } from "@/components/Page/styled";

export const Section = styled("section", { shouldForwardProp: (prop) => prop !== "$layer" })<{
  $layer?: boolean;
}>(({ $layer }) => ({
  paddingBlock: "clamp(2.5rem, 1.5rem + 3.5vw, 4.5rem)",
  background: $layer ? "var(--bg-subtle)" : "transparent",
  borderBlock: $layer ? "1px solid var(--line-soft)" : 0,
  "& h2": { fontSize: "var(--fs-h1)", letterSpacing: "-0.03em" },
}));

export const Split = styled(Inner)({
  display: "grid",
  // minmax(0, …): a wide child (the board peek) scrolls inside its frame instead of widening the page.
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "var(--s-6)",
  "@media (min-width: 1024px)": {
    gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)",
    gap: "var(--s-8)",
    alignItems: "start",
  },
});

export const Muted = styled("p")({
  maxWidth: "26rem",
  marginTop: "var(--s-3)",
  color: "var(--text-2)",
});
