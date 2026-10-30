"use client";

import { styled } from "@mui/material/styles";

export const Root = styled("div", { shouldForwardProp: (prop) => prop !== "$warn" })<{ $warn: boolean }>(
  ({ $warn }) => ({
    padding: "var(--s-4) var(--s-4)",
    borderLeft: `3px solid ${$warn ? "var(--warn-line)" : "var(--blue)"}`,
    background: $warn ? "var(--warn-bg)" : "var(--blue-50)",
    animation: "fb-rise var(--d-4) var(--ease-out-expo) both",
  }),
);

export const Title = styled("p")({ marginBottom: "var(--s-1)", fontWeight: 500 });
