import BoardLoader from "./BoardLoader";

export default function SpikePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Bryntum Scheduler in Next.js 16 / React 19</h1>
      <p>One resource, one read-only event named Held, 6 Nov 2026 16:00–18:00 Pacific.</p>
      <BoardLoader />
    </main>
  );
}
