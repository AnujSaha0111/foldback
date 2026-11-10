"use client";

import { styled } from "@mui/material/styles";

/** A readable column of plain text. */
export const Article = styled("article")({
  maxWidth: "40rem",
  paddingBlock: "var(--s-6)",
  "& h1": { fontSize: "2rem", fontWeight: 500, letterSpacing: "-0.01em" },
  "& h2": { marginTop: "var(--s-5)", fontSize: "1.125rem", fontWeight: 500 },
  "& p, & ul": { marginTop: "var(--s-2)", color: "var(--text-2)" },
  "& ul": { paddingLeft: "1.25rem" },
  "& li + li": { marginTop: "var(--s-1)" },
});
