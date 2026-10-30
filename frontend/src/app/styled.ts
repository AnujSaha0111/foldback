"use client";

import { styled } from "@mui/material/styles";
import { Inner } from "@/components/Page/styled";

export const Hero = styled("section")({
  background: "var(--sky)",
  color: "var(--on-sky)",
  paddingBlock: "var(--s-8)",
});

export const HeroInner = styled(Inner)({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "var(--s-5)",
});

export const Title = styled("h1")({
  margin: 0,
  maxWidth: "16ch",
  fontSize: "var(--fs-display)",
  fontWeight: 300,
  letterSpacing: "-0.03em",
  lineHeight: 1.05,
});

export const Lead = styled("p")({
  margin: 0,
  maxWidth: "46ch",
  fontSize: "var(--fs-lead)",
  lineHeight: 1.5,
});
