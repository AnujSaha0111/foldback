"use client";

import { styled } from "@mui/material/styles";

const DESKTOP = "@media (min-width: 900px)";

export const Toggle = styled("button")({
  display: "grid",
  placeItems: "center",
  width: "3rem",
  height: "3rem",
  border: "1px solid var(--line-strong)",
  background: "none",
  color: "var(--text)",
  cursor: "pointer",
  [DESKTOP]: { display: "none" },
  "& span, & span::before, & span::after": {
    display: "block",
    position: "relative",
    width: "18px",
    height: "2px",
    background: "currentColor",
    content: '""',
  },
  "& span::before": { position: "absolute", top: "-6px" },
  "& span::after": { position: "absolute", top: "6px" },
});

export const Menu = styled("nav")({
  display: "none",
  position: "absolute",
  left: 0,
  right: 0,
  top: "100%",
  padding: "var(--s-4) var(--gutter) var(--s-5)",
  borderBottom: "1px solid var(--line-strong)",
  background: "var(--bg)",
  "&[data-open='true']": { display: "block" },
  [DESKTOP]: {
    display: "flex",
    position: "static",
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    padding: 0,
    border: 0,
    background: "transparent",
  },
});

export const Links = styled("ul")({
  "& a[aria-current='page']": { fontWeight: 500 },
  [DESKTOP]: { display: "flex", gap: "var(--s-5)", marginLeft: "var(--s-6)" },
  "& a": {
    display: "block",
    padding: "var(--s-3) 0",
    borderBottom: "1px solid var(--line)",
    color: "var(--text)",
    textDecoration: "none",
    "&:hover": { color: "var(--link)" },
    [DESKTOP]: { padding: "var(--s-2) 0", border: 0 },
  },
});

export const Actions = styled("div")({
  display: "flex",
  flexDirection: "column",
  gap: "var(--s-3)",
  marginTop: "var(--s-4)",
  [DESKTOP]: { flexDirection: "row", alignItems: "center", marginTop: 0 },
});
