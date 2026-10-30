"use client";

import { styled } from "@mui/material/styles";
import { Inner, onSky } from "@/components/Page/styled";

export const Root = styled("section")({
  ...onSky,
  paddingBlock: "clamp(3.5rem, 2rem + 4vw, 5rem)",
  background: "var(--field-sky)",
  "& h2": {
    maxWidth: "16ch",
    fontSize: "clamp(2.25rem, 1.4rem + 3.4vw, 4rem)",
    fontWeight: 600,
    letterSpacing: "-0.035em",
    lineHeight: 1.02,
  },
});

export const Row = styled(Inner)({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--s-5)",
});
