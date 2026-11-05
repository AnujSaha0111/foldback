"use client";

import { styled } from "@mui/material/styles";
import { COARSE, TOUCH_TARGET } from "@/theme/media";

export const Root = styled("section")({
  overflow: "hidden",
  border: "1px solid var(--line)",
  borderRadius: 0,
  background: "var(--bg)",
  boxShadow: "var(--shadow-2)",
});

export const Head = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.875rem 1.125rem",
  gap: "var(--s-3)",
  background: "var(--sun-grad)",
  color: "#000",
  "& h2": { fontSize: "0.9375rem", fontWeight: 600, letterSpacing: "-0.01em", marginRight: "auto" },
});

/** The popup's close button: square, black on the sun header. */
export const Close = styled("button")({
  position: "relative",
  display: "grid",
  placeItems: "center",
  width: "2.25rem",
  height: "2.25rem",
  border: "1px solid #000",
  borderRadius: 0,
  background: "transparent",
  color: "#000",
  fontSize: "1.25rem",
  lineHeight: 1,
  cursor: "pointer",
  "&:focus-visible": { outline: "2px solid #000", outlineOffset: "2px" },
  // A 44 px target around the 36 px square.
  "&::after": { content: '""', position: "absolute", inset: "-4px" },
});

/** Pick a person from here as well as on the board: the native list works with a keyboard and on a phone. */
export const Picker = styled("select")({
  minHeight: "2.25rem",
  maxWidth: "60%",
  padding: "0 var(--s-2)",
  border: "1px solid var(--line)",
  borderRadius: 0,
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "var(--fs-small)",
  fontWeight: 500,
  cursor: "pointer",
  [COARSE]: { minHeight: TOUCH_TARGET },
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
