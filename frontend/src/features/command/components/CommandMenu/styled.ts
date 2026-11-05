"use client";

import { styled } from "@mui/material/styles";

/** The shortcut on the Search button. Hidden where there is no pointer to hover, which usually means no keyboard. */
export const Key = styled("kbd")({
  padding: "0 var(--s-1)",
  border: "1px solid var(--line)",
  color: "var(--text-2)",
  fontFamily: "var(--font-mono)",
  fontSize: "0.75rem",
  fontWeight: 400,
  "@media (hover: none)": { display: "none" },
});

export const Input = styled("input")({
  width: "100%",
  padding: "var(--s-4)",
  border: 0,
  borderBottom: "1px solid var(--line)",
  background: "var(--bg)",
  color: "var(--text)",
  // 16 px, so iOS does not zoom the page when the field takes focus.
  fontSize: "1rem",
  // The field always has focus while the palette is open; a 2 px focus-coloured rule marks it.
  "&:focus-visible": { outline: "2px solid transparent", boxShadow: "inset 0 -2px 0 var(--focus)" },
});

export const List = styled("ul")({
  maxHeight: "min(22rem, 50dvh)",
  padding: "var(--s-2)",
  overflowY: "auto",
  overscrollBehavior: "contain",
});

/** One result. The active one is shaded at once, with no transition: this list is for the keyboard. */
export const Option = styled("li")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--s-4)",
  minHeight: "2.75rem",
  padding: "0 var(--s-3)",
  cursor: "pointer",
  "& small": { flex: "none", color: "var(--text-3)", fontSize: "var(--fs-small)" },
  "&[aria-selected='true']": { background: "var(--layer-selected)" },
});

export const Empty = styled("p")({ padding: "var(--s-4)", color: "var(--text-2)" });

export const PAPER_SX = {
  alignSelf: "flex-start",
  marginTop: "12dvh",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
  background: "var(--bg)",
  backgroundImage: "none",
  color: "var(--text)",
  boxShadow: "var(--shadow-3)",
};
