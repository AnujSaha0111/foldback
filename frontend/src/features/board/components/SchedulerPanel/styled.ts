"use client";

import { styled } from "@mui/material/styles";
import { TONES } from "@/components/StatusTag/styled";

/**
 * Bryntum's colours come from a scale of neutrals that its theme file fixes to light or dark. Here the scale is
 * computed from our own background and text tokens, so the board and its popups follow the site's theme, and the
 * theme's own file is not needed. Applied globally because tooltips are attached to the page, outside the board.
 */
const neutrals = Object.fromEntries(
  Array.from({ length: 101 }, (_, n) => [
    `--b-neutral-${n}`,
    `color-mix(in srgb, var(--bg) ${n}%, var(--text))`,
  ]),
);

export const BRYNTUM_THEME = {
  "html:root:not(.b-nothing)": {
    ...neutrals,
    "--b-mix": "var(--bg)",
    "--b-opposite": "var(--text)",
    "--b-primary": "var(--blue)",
    "--b-widget-border-radius": "var(--r-tag)",
  },
};

/** One marker's colours: the line, its label in the header, and the words on them. */
const marker = (color: string, ink: string) => ({
  "--b-time-range-line-color": color,
  "--b-time-range-line-header-background": color,
  "--b-time-range-line-label-background": color,
  "--b-time-range-color": ink,
  "--b-time-range-line-label-color": ink,
});

/** Each bar wears the same fill as the status tag with that status, so a status looks the same everywhere. */
const barTones = Object.fromEntries(
  Object.entries(TONES).map(([tone, look]) => [`& .b-sch-event.fb-tone-${tone}`, look]),
);

export const Frame = styled("div")({
  overflow: "hidden",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
  background: "var(--bg)",
  boxShadow: "var(--shadow-2)",
  "& .b-sch-event": { border: "1px solid transparent", borderRadius: "var(--r-tag)", fontWeight: 600 },
  ...barTones,
  // A bar too short for its word: the word sits beside it, so the status is never clipped.
  "& .b-sch-event.fb-short": { overflow: "visible" },
  "& .b-sch-event.fb-short .b-sch-event-content": {
    position: "absolute",
    left: "100%",
    marginLeft: "6px",
    whiteSpace: "nowrap",
    color: "var(--text)",
  },
  "& .fb-link": {
    display: "inline-grid",
    placeItems: "center",
    minHeight: "2rem",
    marginInlineEnd: "var(--s-2)",
    padding: "0 var(--s-3)",
    border: "1px solid var(--line)",
    borderRadius: 0,
    background: "var(--bg)",
    color: "var(--text)",
    font: "inherit",
    fontSize: "var(--fs-small)",
    fontWeight: 500,
    textDecoration: "none",
    cursor: "pointer",
    transition: "background-color 150ms ease-out, color 150ms ease-out",
  },
  "@media (hover: hover)": {
    "& .fb-link:hover": { background: "var(--sun-grad)", color: "#000", borderColor: "transparent" },
  },
  "& .fb-link:focus-visible": { outline: "2px solid var(--blue)", outlineOffset: "2px" },
  "& .fb-now": marker("var(--blue)", "var(--st-held-fg)"),
  "& .fb-deadline": marker("var(--sun)", "#000"),
  "& .fb-grace": marker("var(--text)", "var(--bg)"),
  "& .fb-proposed": marker("var(--text-2)", "var(--bg)"),
  "& .b-sch-line.fb-proposed": { borderInlineStartStyle: "dashed" },
  // Now and Deadline can be hours apart. Now's label sits left of its line and Deadline's right of its own.
  "& .b-time-ranges-header-canvas .fb-now": { translate: "-100% 0" },
});

/** Holds the board's place while the Bryntum chunk loads, so the page does not jump. */
export const Placeholder = styled("div")({
  display: "grid",
  placeItems: "center",
  height: "20rem",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-panel)",
  background: "var(--bg)",
});

export const Caption = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: "var(--s-3)",
  padding: "0.625rem var(--s-4)",
  borderTop: "1px solid var(--line-soft)",
  fontSize: "var(--fs-caption)",
  color: "var(--text-3)",
});

export const Legend = styled("span")({
  display: "inline-flex",
  gap: "var(--s-4)",
  "& span": { display: "inline-flex", alignItems: "center", gap: "6px" },
  "& span::before": { content: '""', width: "14px", height: "2px" },
  "& [data-kind='now']::before": { background: "var(--blue)" },
  "& [data-kind='deadline']::before": { background: "var(--sun)" },
  "& [data-kind='grace']::before": {
    background: "repeating-linear-gradient(90deg, var(--text) 0 3px, transparent 3px 6px)",
  },
});
