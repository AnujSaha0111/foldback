"use client";

import { styled } from "@mui/material/styles";
import { HOVER } from "@/theme/media";

export const Root = styled("nav")({
  display: "flex",
  gap: "var(--s-6)",
  marginBottom: "var(--s-4)",
  borderBottom: "1px solid var(--line)",
  "& a": {
    position: "relative",
    height: "2.75rem",
    display: "flex",
    alignItems: "center",
    color: "var(--text-2)",
    fontSize: "0.9375rem",
    fontWeight: 500,
    textDecoration: "none",
    transition: "color var(--d-2) var(--ease-out-quad)",
  },
  "& a[aria-current='page']": { color: "var(--text)" },
  [HOVER]: { "& a:hover": { color: "var(--text)" } },
  "& a::after": {
    content: '""',
    position: "absolute",
    left: 0,
    right: 0,
    bottom: "-1px",
    height: "2px",
    background: "var(--text)",
    transform: "scaleX(0)",
    transformOrigin: "0 50%",
    transition: "transform var(--d-4) var(--ease-out-expo)",
  },
  "& a[aria-current='page']::after": { transform: "scaleX(1)" },
});
