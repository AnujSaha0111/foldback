"use client";

import Link from "next/link";
import { styled } from "@mui/material/styles";
import type { CSSObject } from "@mui/material/styles";

export type ButtonVariant = "primary" | "blue" | "secondary" | "link";

export interface LookProps {
  $variant: ButtonVariant;
  $small: boolean;
  $block: boolean;
}

const BASE: CSSObject = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--s-6)",
  minHeight: "3rem",
  padding: "0 var(--s-4)",
  border: "1px solid transparent",
  fontWeight: 500,
  lineHeight: 1.2,
  textDecoration: "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "background-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease)",
};

const VARIANTS: Record<ButtonVariant, CSSObject> = {
  primary: {
    background: "var(--btn-bg)",
    color: "var(--btn-fg)",
    "&:hover": { background: "var(--btn-hover)" },
  },
  blue: { background: "var(--blue)", color: "#fff", "&:hover": { background: "#0058b3" } },
  secondary: {
    background: "transparent",
    color: "var(--text)",
    borderColor: "var(--text)",
    "&:hover": { background: "var(--text)", color: "var(--bg)" },
  },
  link: {
    background: "transparent",
    color: "var(--link)",
    paddingInline: 0,
    minHeight: "2.5rem",
    gap: "var(--s-3)",
    "&:hover": { background: "transparent", textDecoration: "underline" },
  },
};

const DISABLED: CSSObject = {
  background: "var(--layer-2)",
  color: "var(--text-2)",
  borderColor: "transparent",
  cursor: "not-allowed",
};

/** One look for the button and the link that looks like one, so the two can never drift apart. */
function look({ $variant, $small, $block }: LookProps): CSSObject {
  return {
    ...BASE,
    ...VARIANTS[$variant],
    ...($small
      ? { minHeight: "2.25rem", paddingInline: "var(--s-3)", fontSize: "var(--fs-small)", gap: "var(--s-4)" }
      : {}),
    ...($block ? { width: "100%" } : {}),
    "&[disabled], &[aria-disabled='true']": DISABLED,
  };
}

const keepOut = (prop: PropertyKey): boolean => typeof prop !== "string" || !prop.startsWith("$");

export const StyledButton = styled("button", { shouldForwardProp: keepOut })<LookProps>(look);
export const StyledLink = styled(Link, { shouldForwardProp: keepOut })<LookProps>(look);
