"use client";

import dynamic from "next/dynamic";

// Bryntum touches `window`, so it must never render on the server.
const Board = dynamic(() => import("./Board"), {
  ssr: false,
  loading: () => <p>Loading board…</p>,
});

export default function BoardLoader() {
  return <Board />;
}
