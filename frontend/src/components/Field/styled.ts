"use client";

import { styled } from "@mui/material/styles";
import type { CSSObject } from "@mui/material/styles";

export const Root = styled("div")({ "& + &": { marginTop: "var(--s-5)" } });

export const Label = styled("label")({
  display: "block",
  marginBottom: "var(--s-2)",
  fontSize: "var(--fs-small)",
  color: "var(--text-2)",
});

const FILLED: CSSObject = {
  display: "block",
  width: "100%",
  minHeight: "3rem",
  padding: "var(--s-3) var(--s-4)",
  border: 0,
  borderBottom: "1px solid var(--text-2)",
  background: "var(--layer)",
  color: "var(--text)",
  "&::placeholder": { color: "var(--text-2)", opacity: 0.8 },
  "&:focus-visible": { outlineOffset: 0 },
};

export const Input = styled("input")(FILLED);

export const Area = styled("textarea")({ ...FILLED, minHeight: "9rem", lineHeight: 1.5, resize: "vertical" });

export const Help = styled("div")({
  marginTop: "var(--s-2)",
  fontSize: "var(--fs-caption)",
  color: "var(--text-2)",
});
