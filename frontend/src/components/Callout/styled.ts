"use client";

import { styled } from "@mui/material/styles";

export const Root = styled("div", { shouldForwardProp: (prop) => prop !== "$warn" })<{ $warn: boolean }>(
  ({ $warn }) => ({
    padding: "var(--s-4) var(--s-5)",
    border: `1px solid ${$warn ? "var(--warn-line)" : "var(--line)"}`,
    background: $warn ? "var(--warn-bg)" : "var(--layer)",
  }),
);

export const Title = styled("p")({ marginBottom: "var(--s-1)", fontWeight: 500 });
