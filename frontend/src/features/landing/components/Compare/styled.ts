"use client";

import { styled } from "@mui/material/styles";
import { HOVER } from "@/theme/media";

const WIDE = "@media (min-width: 768px)";

export const Head = styled("div")({
  maxWidth: "40rem",
  marginBottom: "var(--s-6)",
  "& p": { marginTop: "var(--s-3)", color: "var(--text-2)" },
});

export const Panels = styled("div")({
  display: "grid",
  gap: "var(--s-3)",
  alignItems: "start",
  [WIDE]: { gridTemplateColumns: "1fr 1fr", gap: 0 },
  "& h3": { marginBottom: "var(--s-4)" },
  "& li": {
    display: "flex",
    gap: "var(--s-3)",
    padding: "var(--s-3) 0",
    borderTop: "1px solid var(--line-soft)",
    fontSize: "0.9375rem",
  },
  "& li::before": { flex: "none", width: "1rem", fontWeight: 600 },
});

export const Panel = styled("div")({
  padding: "var(--s-6)",
  background: "var(--bg)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
  "& li::before": { content: '"×"', color: "var(--text-3)" },
  [WIDE]: { borderRadius: "var(--r-panel) 0 0 var(--r-panel)", borderRight: 0 },
});

/** The answer: lifted 8 px in navy, and it rises a little more on hover. */
export const DarkPanel = styled("div")({
  position: "relative",
  zIndex: 1,
  padding: "var(--s-6)",
  borderRadius: "var(--r-panel)",
  background: "var(--navy)",
  color: "var(--paper)",
  boxShadow: "var(--shadow-3)",
  transition: "transform var(--d-4) var(--ease-out-expo), box-shadow var(--d-4) var(--ease-out-quad)",
  "& li": { borderColor: "rgba(255, 255, 255, 0.12)" },
  "& li::before": { content: '"✓"', color: "var(--sky)" },
  [WIDE]: {
    transform: "translateY(-8px) scale(1.02)",
    [HOVER]: { "&:hover": { transform: "translateY(-12px) scale(1.02)", boxShadow: "var(--shadow-4)" } },
  },
});
