"use client";

import { styled } from "@mui/material/styles";

export const Root = styled("span")({
  display: "inline-flex",
  gap: "4px",
  "& i": { width: "16px", height: "16px", boxShadow: "inset 0 0 0 2px var(--sun)" },
  "& i[data-on='true']": { background: "var(--blue)", boxShadow: "none" },
});
