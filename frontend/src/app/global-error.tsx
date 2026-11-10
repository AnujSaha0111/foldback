"use client";

/** A crash in the root layout itself, so no theme or component is available: plain HTML only. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <h1>Something went wrong.</h1>
        <p>Nothing was charged and no hold changed.</p>
        <button type="button" onClick={() => reset()}>
          Reload
        </button>
      </body>
    </html>
  );
}
