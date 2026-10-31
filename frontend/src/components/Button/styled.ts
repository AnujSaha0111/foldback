"use client";

import Link from "next/link";
import { styled } from "@mui/material/styles";
import type { CSSObject } from "@mui/material/styles";
import { HOVER, HOVER_FINE } from "@/theme/media";

/** `sun` is the one action that matters on a view. Use it once per screen. */
export type ButtonVariant = "sun" | "primary" | "blue" | "secondary" | "link";

export interface LookProps {
  $variant: ButtonVariant;
  $small: boolean;
  $block: boolean;
}

const ARROW = "& > span[aria-hidden='true']:last-child";

const BASE: CSSObject = {
  position: "relative",
  isolation: "isolate",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--s-5)",
  minHeight: "2.75rem",
  padding: "0 var(--s-5)",
  border: "1px solid transparent",
  fontSize: "0.9375rem",
  fontWeight: 500,
  lineHeight: 1.2,
  textDecoration: "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
  transition: [
    "background-color var(--d-2) var(--ease-out-quad)",
    "background-position var(--d-4) var(--ease-out-quart)",
    "border-color var(--d-2) var(--ease-out-quad)",
    "color var(--d-2) var(--ease-out-quad)",
    "box-shadow var(--d-3) var(--ease-out-quad)",
    "transform var(--d-3) var(--ease-out-expo)",
  ].join(", "),
  // Press: a small, quick give, then a soft spring back.
  "&:active:not([disabled]):not([aria-disabled='true'])": {
    transform: "scale(0.96)",
    transitionDuration: "var(--d-press)",
  },
  "&:focus-visible": { outline: "none", boxShadow: "var(--focus-ring)" },
  [ARROW]: { display: "inline-block", transition: "transform var(--d-3) var(--ease-out-expo)" },
  [HOVER_FINE]: { "&:hover > span[aria-hidden='true']:last-child": { transform: "translateX(3px)" } },
};

const VARIANTS: Record<ButtonVariant, CSSObject> = {
  sun: {
    overflow: "hidden",
    color: "#000",
    fontWeight: 600,
    backgroundImage: "var(--sun-grad-wide)",
    backgroundSize: "220% 100%",
    backgroundPosition: "0% 50%",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.08)",
    // A sheen crosses the button once per hover.
    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      zIndex: -1,
      pointerEvents: "none",
      background: "linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.45) 50%, transparent 65%)",
      transform: "translateX(-100%)",
    },
    [HOVER]: {
      "&:hover": {
        backgroundPosition: "60% 50%",
        boxShadow:
          "inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.08), var(--sun-glow)",
      },
      "&:hover::after": {
        transform: "translateX(100%)",
        transition: "transform 900ms var(--ease-out-quart)",
      },
    },
  },
  primary: {
    background: "var(--btn-bg)",
    color: "var(--btn-fg)",
    [HOVER]: { "&:hover": { background: "var(--btn-hover)" } },
  },
  blue: {
    background: "var(--blue)",
    color: "#fff",
    [HOVER]: { "&:hover": { background: "var(--blue-600)" } },
  },
  // The border thickens on hover instead of inverting, which is calmer next to the one sun button.
  secondary: {
    background: "transparent",
    color: "var(--text)",
    borderColor: "var(--text)",
    [HOVER]: {
      "&:hover": {
        boxShadow: "inset 0 0 0 1px var(--text)",
        background: "color-mix(in srgb, var(--text) 4%, transparent)",
      },
    },
  },
  link: {
    background: "linear-gradient(currentColor, currentColor) 0 calc(100% - 0.6rem) / 0 1px no-repeat",
    color: "var(--link)",
    paddingInline: 0,
    minHeight: "2.5rem",
    gap: "var(--s-3)",
    transition: "background-size var(--d-3) var(--ease-out-quart), color var(--d-2) var(--ease-out-quad)",
    [HOVER]: { "&:hover": { backgroundSize: "100% 1px" } },
    "&:active:not([disabled])": { transform: "none" },
  },
};

const DISABLED: CSSObject = {
  opacity: 0.42,
  cursor: "not-allowed",
  boxShadow: "none",
};

/** One look for the button and the link that looks like one, so the two can never drift apart. */
function look({ $variant, $small, $block }: LookProps): CSSObject {
  return {
    ...BASE,
    ...VARIANTS[$variant],
    ...($small
      ? { minHeight: "2.25rem", paddingInline: "var(--s-4)", fontSize: "var(--fs-small)", gap: "var(--s-3)" }
      : {}),
    ...($block ? { width: "100%" } : {}),
    "&[disabled], &[aria-disabled='true']": DISABLED,
  };
}

const keepOut = (prop: PropertyKey): boolean => typeof prop !== "string" || !prop.startsWith("$");

export const StyledButton = styled("button", { shouldForwardProp: keepOut })<LookProps>(look);
export const StyledLink = styled(Link, { shouldForwardProp: keepOut })<LookProps>(look);
