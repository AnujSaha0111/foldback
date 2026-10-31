"use client";

import { styled } from "@mui/material/styles";
import { onSky } from "@/components/Page/styled";

const SHEET = "0.75rem";

/** 480 px at most: this page is read on a phone. */
export const Column = styled("div")({
  width: "100%",
  maxWidth: "30rem",
  marginInline: "auto",
  padding: "var(--s-4) var(--gutter)",
});

export const Band = styled("section")({
  ...onSky,
  paddingBottom: SHEET,
  background: "var(--field-sky)",
  "& h1": { marginTop: "var(--s-1)", fontSize: "1.5rem", fontWeight: 500, letterSpacing: "-0.01em" },
});

export const Who = styled("p")({ fontSize: "var(--fs-small)" });

export const Amount = styled("p")({
  marginTop: "var(--s-2)",
  fontFamily: "var(--font-mono)",
  fontSize: "clamp(3rem, 15vw, 4.5rem)",
  fontWeight: 500,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.04em",
  lineHeight: 1.05,
});

/** A sheet lifted over the sky band, so "a hold, not a charge" is the first thing under the amount. */
export const Body = styled("section")({
  position: "relative",
  marginTop: `calc(${SHEET} * -1)`,
  borderRadius: `${SHEET} ${SHEET} 0 0`,
  background: "var(--bg)",
  "& p + p": { marginTop: "var(--s-2)" },
});

export const Lead = styled("p")({
  fontSize: "1.5rem",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  lineHeight: 1.15,
});

export const Panel = styled("div")({
  marginTop: "var(--s-4)",
  paddingInline: "var(--s-4)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
});

export const Row = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--s-3)",
  paddingBlock: "var(--s-3)",
  fontWeight: 500,
  "& + &": { borderTop: "1px solid var(--line)" },
  "& > span:first-of-type": { display: "inline-flex", alignItems: "center", gap: "var(--s-3)" },
});

export const Others = styled("p")({
  paddingBlock: "var(--s-3)",
  borderTop: "1px solid var(--line)",
  fontSize: "var(--fs-small)",
  color: "var(--text-2)",
});

export const Act = styled("div")({ marginTop: "var(--s-4)" });

export const Message = styled("p")({ fontSize: "var(--fs-lead)", lineHeight: 1.35 });

export const Help = styled("p")({
  marginTop: "var(--s-2)",
  fontSize: "var(--fs-small)",
  color: "var(--text-2)",
});
