"use client";

import { styled } from "@mui/material/styles";
import { HOVER } from "@/theme/media";

const DESKTOP = "@media (min-width: 900px)";

export const Toggle = styled("button")({
  display: "grid",
  placeItems: "center",
  width: "2.75rem",
  height: "2.75rem",
  marginRight: "-0.5rem",
  border: 0,
  background: "none",
  color: "var(--text)",
  cursor: "pointer",
  [DESKTOP]: { display: "none" },
  // Two lines that turn into a cross.
  "& span, & span::before": {
    display: "block",
    width: "20px",
    height: "1.5px",
    background: "currentColor",
    content: '""',
    transition: "transform var(--d-4) var(--ease-out-expo)",
  },
  "& span": { position: "relative", transform: "translateY(-3px)" },
  "& span::before": { position: "absolute", top: "6px" },
  "&[aria-expanded='true'] span": { transform: "rotate(45deg)" },
  "&[aria-expanded='true'] span::before": { transform: "translateY(-6px) rotate(-90deg)" },
});

/** On phones the menu wipes down as a solid panel (and closes at once); on desktop it is the inline nav. */
export const Menu = styled("nav")({
  display: "none",
  position: "absolute",
  left: 0,
  right: 0,
  top: "calc(100% + var(--s-2))",
  padding: "var(--s-3) var(--s-4) var(--s-5)",
  border: "1px solid var(--line-soft)",
  borderRadius: "var(--r-panel)",
  boxShadow: "var(--shadow-2)",
  background: "var(--bg)",
  "&[data-open='true']": { display: "block", animation: "fb-sheet var(--d-4) var(--ease-drawer) both" },
  [DESKTOP]: {
    display: "flex",
    position: "static",
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    padding: 0,
    border: 0,
    boxShadow: "none",
    background: "transparent",
    animation: "none",
  },
});

export const Links = styled("ul")({
  "& a": {
    position: "relative",
    display: "block",
    padding: "var(--s-3) 0",
    borderBottom: "1px solid var(--line-soft)",
    color: "var(--text)",
    fontSize: "1.125rem",
    textDecoration: "none",
    [DESKTOP]: { padding: "var(--s-2) 0", border: 0, fontSize: "0.9375rem", fontWeight: 500 },
  },
  // On desktop the underline sweeps in from the left and leaves to the right.
  [DESKTOP]: {
    display: "flex",
    gap: "var(--s-6)",
    marginInline: "auto",
    "& a::after": {
      content: '""',
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "1.5px",
      background: "currentColor",
      transform: "scaleX(0)",
      transformOrigin: "100% 50%",
      transition: "transform var(--d-4) var(--ease-out-expo)",
    },
    "& a[aria-current='page']::after": { transform: "scaleX(1)", transformOrigin: "0 50%" },
    [HOVER]: { "& a:hover::after": { transform: "scaleX(1)", transformOrigin: "0 50%" } },
  },
});

export const Actions = styled("div")({
  display: "flex",
  flexDirection: "column",
  gap: "var(--s-3)",
  marginTop: "var(--s-5)",
  [DESKTOP]: { flexDirection: "row", alignItems: "center", gap: "var(--s-4)", marginTop: 0 },
});
