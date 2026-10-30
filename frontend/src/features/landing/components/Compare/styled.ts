"use client";

import { styled } from "@mui/material/styles";

const WIDE = "@media (min-width: 768px)";

export const Head = styled("div")({
  maxWidth: "40rem",
  marginBottom: "var(--s-6)",
  "& p": { marginTop: "var(--s-3)", color: "var(--text-2)" },
});

export const Panels = styled("div")({
  display: "grid",
  border: "1px solid var(--line-strong)",
  [WIDE]: { gridTemplateColumns: "1fr 1fr" },
  "& h3": { marginBottom: "var(--s-3)" },
  "& li": { padding: "var(--s-2) 0", borderTop: "1px solid var(--line)" },
  "& li:first-of-type": { borderTop: 0 },
});

export const Panel = styled("div")({ padding: "var(--s-5)" });

export const DarkPanel = styled(Panel)({
  borderTop: "1px solid var(--line-strong)",
  background: "var(--navy)",
  color: "var(--paper)",
  [WIDE]: { borderTop: 0, borderLeft: "1px solid var(--line-strong)" },
  "& li": { borderColor: "rgba(255, 255, 255, 0.3)" },
});
