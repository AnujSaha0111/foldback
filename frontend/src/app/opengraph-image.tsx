import { ImageResponse } from "next/og";

export const alt = "Foldback: nobody pays unless the group makes it.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SQUARE = { width: 72, height: 72 };

/** The four-squares mark (three held, one open) and the line, on the sky colour. Drawn at build time. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: "#eaf8ff",
        color: "#000",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ ...SQUARE, background: "#0070e0" }} />
        <div style={{ ...SQUARE, background: "#0070e0" }} />
        <div style={{ ...SQUARE, background: "#0070e0" }} />
        <div style={{ ...SQUARE, border: "6px solid #f2501e" }} />
      </div>
      <div style={{ marginTop: 56, fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>Foldback</div>
      <div style={{ marginTop: 16, fontSize: 48 }}>Nobody pays unless the group makes it.</div>
    </div>,
    size,
  );
}
