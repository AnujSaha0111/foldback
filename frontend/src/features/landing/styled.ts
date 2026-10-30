"use client";

import { styled } from "@mui/material/styles";
import { Inner } from "@/components/Page/styled";

export const Section = styled("section", { shouldForwardProp: (prop) => prop !== "$layer" })<{
  $layer?: boolean;
}>(({ $layer }) => ({
  paddingBlock: "clamp(3.5rem, 2rem + 5vw, 6rem)",
  background: $layer ? "var(--bg-subtle)" : "transparent",
  borderBlock: $layer ? "1px solid var(--line-soft)" : 0,
}));

export const Split = styled(Inner)({
  display: "grid",
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
