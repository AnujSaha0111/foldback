"use client";

import { styled } from "@mui/material/styles";
import { Mono } from "@/components/Money/styled";

export const Root = styled("div")({
  marginTop: "var(--s-7)",
  background: "var(--bg)",
  color: "var(--text)",
  "@media (min-width: 1024px)": { marginTop: 0 },
});

export const Head = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "var(--s-2) var(--s-5)",
  padding: "var(--s-4) var(--s-4) var(--s-3)",
  "& strong": { fontWeight: 500 },
});

export const Small = styled("span")({ fontSize: "var(--fs-small)", color: "var(--text-2)" });

export const Row = styled("div")({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto auto",
  gap: "var(--s-4)",
  alignItems: "center",
  padding: "var(--s-3) var(--s-4)",
  borderTop: "1px solid var(--line)",
  "@media (min-width: 768px)": { gridTemplateColumns: "minmax(0, 1fr) 7rem 6rem" },
});

export const Amount = styled(Mono)({ textAlign: "right" });

export const Sum = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: "var(--s-2)",
  padding: "var(--s-3) var(--s-4)",
  background: "var(--layer)",
  fontSize: "var(--fs-small)",
});

export const Squares = styled("span")({
  display: "inline-flex",
  gap: "4px",
  marginRight: "var(--s-2)",
  verticalAlign: "middle",
  "& i": { display: "block", width: "12px", height: "12px", border: "2px solid var(--blue)" },
  "& i[data-on='true']": { background: "var(--blue)" },
});
