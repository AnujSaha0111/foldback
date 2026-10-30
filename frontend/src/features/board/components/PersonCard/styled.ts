"use client";

import { styled } from "@mui/material/styles";

export const Root = styled("section")({
  overflow: "hidden",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
  background: "var(--bg)",
  boxShadow: "var(--shadow-2)",
});

export const Head = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.875rem 1.125rem",
  borderBottom: "1px solid var(--line-soft)",
  "& h2": { fontSize: "0.9375rem", fontWeight: 600, letterSpacing: "-0.01em" },
  "& span": { fontSize: "var(--fs-caption)", color: "var(--text-3)" },
});

/** Re-enters with a short blur-rise each time a different person is selected (keyed by the share). */
export const Body = styled("div")({
  display: "grid",
  gap: "var(--s-4)",
  padding: "1.125rem",
  animation: "fb-rise var(--d-4) var(--ease-out-expo) both",
});

export const Top = styled("div")({ display: "flex", alignItems: "flex-start", gap: "var(--s-4)" });

export const Name = styled("div")({
  flex: 1,
  minWidth: 0,
  "& > strong": { display: "block", fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.015em" },
  "& > div": { display: "flex", flexWrap: "wrap", gap: "var(--s-2)", marginTop: "6px" },
});

export const Amount = styled("span")({ fontSize: "1.125rem" });

export const Facts = styled("dl")({
  display: "grid",
  gridTemplateColumns: "minmax(7rem, 38%) 1fr",
  margin: 0,
  "& dt, & dd": {
    margin: 0,
    padding: "0.6875rem 0",
    borderTop: "1px solid var(--line-soft)",
    fontSize: "0.875rem",
  },
  "& dt": { color: "var(--text-2)" },
  "& dd": { minWidth: 0, overflowWrap: "anywhere" },
});

export const Actions = styled("div")({ display: "flex", flexWrap: "wrap", gap: "var(--s-2)" });

export const Empty = styled("p")({ padding: "1.125rem", color: "var(--text-2)" });
