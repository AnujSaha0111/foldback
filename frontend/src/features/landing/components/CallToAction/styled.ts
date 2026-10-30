"use client";

import { styled } from "@mui/material/styles";
import { Inner, onSky } from "@/components/Page/styled";

export const Root = styled("section")({
  ...onSky,
  paddingBlock: "var(--s-7)",
  background: "var(--sky)",
  "& h2": { maxWidth: "22ch" },
});

export const Row = styled(Inner)({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--s-5)",
});
