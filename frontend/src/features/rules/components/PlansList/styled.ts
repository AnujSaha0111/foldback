"use client";

import { styled } from "@mui/material/styles";

export const Root = styled("section")({
  marginTop: "var(--s-8)",
  "& h2": { marginBottom: "var(--s-4)" },
});

export const Holds = styled("span")({ fontFamily: "var(--font-mono)", whiteSpace: "nowrap" });
