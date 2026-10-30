"use client";

import { styled } from "@mui/material/styles";

export type AvatarSize = "sm" | "md" | "lg";

const SIZES: Record<AvatarSize, { box: string; fold: string; font: string }> = {
  sm: { box: "1.5rem", fold: "6px", font: "0.6875rem" },
  md: { box: "1.75rem", fold: "7px", font: "0.75rem" },
  lg: { box: "2.75rem", fold: "9px", font: "1rem" },
};

/** The logo's fold at small scale: initials on a sky square with a navy corner. Never round. */
export const Root = styled("span", { shouldForwardProp: (prop) => prop !== "$size" })<{ $size: AvatarSize }>(
  ({ $size }) => {
    const { box, fold, font } = SIZES[$size];
    return {
      position: "relative",
      display: "grid",
      placeItems: "center",
      flex: "none",
      width: box,
      height: box,
      background: "var(--sky)",
      color: "#000",
      fontSize: font,
      fontWeight: 600,
      clipPath: `polygon(0 0, calc(100% - ${fold}) 0, 100% ${fold}, 100% 100%, 0 100%)`,
      "&::after": {
        content: '""',
        position: "absolute",
        top: 0,
        right: 0,
        width: fold,
        height: fold,
        background: "var(--navy)",
        clipPath: "polygon(0 0, 0 100%, 100% 100%)",
      },
    };
  },
);
