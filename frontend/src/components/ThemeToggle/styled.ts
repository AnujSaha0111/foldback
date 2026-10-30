"use client";

import { styled } from "@mui/material/styles";

export const Switch = styled("button")({
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--s-3)",
  minHeight: "2.5rem",
  padding: 0,
  border: 0,
  background: "transparent",
  color: "var(--text)",
  font: "inherit",
  cursor: "pointer",
});

/** The track is a square-cornered box with a square knob, in keeping with radius 0. */
export const Track = styled("span", { shouldForwardProp: (prop) => prop !== "$on" })<{ $on: boolean }>(
  ({ $on }) => ({
    position: "relative",
    width: "2.75rem",
    height: "1.5rem",
    border: "1px solid var(--line-strong)",
    background: $on ? "var(--text)" : "transparent",
    transition: "background-color var(--t-fast) var(--ease)",
    "&::after": {
      content: '""',
      position: "absolute",
      top: "0.1875rem",
      left: $on ? "1.5rem" : "0.1875rem",
      width: "1rem",
      height: "1rem",
      background: $on ? "var(--bg)" : "var(--text)",
      transition: "left var(--t-fast) var(--ease)",
    },
  }),
);
