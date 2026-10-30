"use client";

import { styled } from "@mui/material/styles";

/**
 * A rule down the left of the steps that fills as you scroll (`--p` from useScrollProgress), with a square per step.
 * Without JS or under reduced motion it rests full.
 */
export const Line = styled("div")({
  "--p": 1,
  position: "relative",
  paddingLeft: "1.75rem",
  "&::before, &::after": {
    content: '""',
    position: "absolute",
    left: "4px",
    top: "1.4rem",
    bottom: "1.4rem",
    width: "1px",
  },
  "&::before": { background: "var(--line)" },
  "&::after": {
    background: "var(--text)",
    transformOrigin: "0 0",
    transform: "scaleY(clamp(0, calc((var(--p) - 0.2) / 0.5), 1))",
  },
  "& li": { position: "relative", borderTop: 0 },
  "& li::before": {
    content: '""',
    position: "absolute",
    left: "calc(-1.75rem + 0px)",
    top: "1.45rem",
    width: "9px",
    height: "9px",
    background: "var(--bg)",
    border: "1px solid var(--text)",
    zIndex: 1,
  },
  "& li:first-of-type::before": { background: "var(--text)" },
});

export const Chip = styled("span")({
  display: "inline-flex",
  alignItems: "center",
  height: "1.875rem",
  padding: "0 0.625rem",
  borderRadius: "var(--r-tag)",
  background: "var(--layer)",
  fontSize: "var(--fs-small)",
});

/** The assistant's side of the section: a real-looking conversation, the reply carrying its tool line. */
export const Chat = styled("div")({
  overflow: "hidden",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
  background: "var(--bg)",
  boxShadow: "var(--shadow-2)",
});

export const ChatHead = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.875rem 1.125rem",
  borderBottom: "1px solid var(--line-soft)",
  fontSize: "0.9375rem",
  fontWeight: 600,
  "& span": { fontSize: "var(--fs-caption)", fontWeight: 400, color: "var(--text-3)" },
});

export const Messages = styled("div")({
  display: "flex",
  flexDirection: "column",
  gap: "var(--s-3)",
  padding: "1.125rem",
  "& p": { maxWidth: "92%", padding: "0.625rem 0.875rem", fontSize: "0.9375rem", lineHeight: 1.5 },
  "& p:first-of-type": {
    alignSelf: "flex-end",
    background: "var(--btn-bg)",
    color: "var(--btn-fg)",
    borderRadius: "10px 10px 2px 10px",
  },
  "& p:last-of-type": {
    alignSelf: "flex-start",
    background: "var(--layer)",
    borderRadius: "10px 10px 10px 2px",
  },
  "& small": {
    display: "block",
    marginTop: "6px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    color: "var(--text-2)",
  },
});

export const Stack = styled("div")({ "& > * + *": { marginTop: "var(--s-6)" } });
