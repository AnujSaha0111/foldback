import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The "F" of the logo for home screens, drawn at build time. The browser tab keeps icon.svg. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#60cdff",
        color: "#000",
        fontSize: 128,
        fontWeight: 700,
        fontFamily: "sans-serif",
      }}
    >
      F
    </div>,
    size,
  );
}
