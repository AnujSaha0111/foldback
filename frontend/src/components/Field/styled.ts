"use client";

import { styled } from "@mui/material/styles";
import type { CSSObject } from "@mui/material/styles";

export const Root = styled("div")({ "& + &": { marginTop: "var(--s-5)" } });

export const Label = styled("label")({
  display: "block",
  marginBottom: "var(--s-2)",
  fontSize: "var(--fs-small)",
  fontWeight: 500,
  color: "var(--text)",
});

/** Focus draws a 2 px blue line out from the centre, so focus is felt as well as seen. */
export const Control = styled("div")({
  position: "relative",
  "&::after": {
    content: '""',
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "2px",
    background: "var(--focus)",
    transform: "scaleX(0)",
    transition: "transform var(--d-4) var(--ease-out-expo)",
    pointerEvents: "none",
  },
  "&:focus-within::after": { transform: "scaleX(1)" },
});

const FILLED: CSSObject = {
  display: "block",
  width: "100%",
  minHeight: "3rem",
  padding: "var(--s-3) var(--s-4)",
  border: 0,
  borderBottom: "1px solid var(--text-3)",
  background: "var(--layer)",
  color: "var(--text)",
  transition: "background-color var(--d-2) var(--ease-out-quad)",
  "&::placeholder": { color: "var(--text-3)" },
  "&:hover": { background: "var(--layer-hover)" },
  "&:focus": { background: "var(--bg)", boxShadow: "inset 0 0 0 1px var(--line)" },
  "&:focus-visible": { outline: "none" },
};

export const Input = styled("input")(FILLED);

export const Area = styled("textarea")({ ...FILLED, minHeight: "9rem", lineHeight: 1.6, resize: "vertical" });

export const Help = styled("div")({
  marginTop: "var(--s-2)",
  fontSize: "var(--fs-caption)",
  color: "var(--text-2)",
});
