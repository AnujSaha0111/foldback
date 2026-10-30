"use client";

import { styled } from "@mui/material/styles";
import { Inner } from "@/components/Page/styled";

export const Root = styled("header")({
  position: "relative",
  zIndex: 20,
  background: "var(--bg)",
  borderBottom: "1px solid var(--line)",
});

export const Bar = styled(Inner)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--s-4)",
  minHeight: "3.5rem",
  "@media (min-width: 900px)": { minHeight: "4rem" },
});
