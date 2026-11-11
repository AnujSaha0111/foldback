"use client";

import { styled } from "@mui/material/styles";

export const Message = styled("p")({
  marginTop: "var(--s-2)",
  fontSize: "var(--fs-small)",
  fontWeight: 500,
  color: "var(--danger-text)",
  "&:empty": { marginTop: 0 },
});
