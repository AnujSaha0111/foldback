const HELD_ROWS = [
  { name: "Alex Chen", y: 290 },
  { name: "Sam Ortiz", y: 330 },
  { name: "Jordan Lee", y: 370 },
];

/** The Pay page on a phone, drawn as SVG so it follows the palette. It is always dark, in both themes. */
export function PhoneArt() {
  return (
    <svg
      viewBox="0 0 300 560"
      role="img"
      aria-label="A phone showing a pay page: $80.00 share for Cabin weekend, a hold, not a charge, three friends Held, Maya Waiting"
      fontFamily="var(--font-sans)"
    >
      <rect width="300" height="560" fill="var(--ink)" />
      <rect x="12" y="12" width="276" height="536" fill="#161616" stroke="var(--sky)" strokeWidth="2" />
      <rect x="14" y="14" width="272" height="150" fill="var(--sky)" />
      <text x="30" y="52" fontSize="13" fill="var(--ink)">
        Maya Shah, your share for
      </text>
      <text x="30" y="80" fontSize="22" fontWeight="500" fill="var(--ink)">
        Cabin weekend
      </text>
      <text x="30" y="140" fontSize="50" fontWeight="500" fill="var(--ink)" fontFamily="var(--font-mono)">
        $80.00
      </text>
      <text x="30" y="206" fontSize="22" fontWeight="600" fill="var(--paper)">
        This is a hold,
      </text>
      <text x="30" y="234" fontSize="22" fontWeight="600" fill="var(--paper)">
        not a charge.
      </text>
      <g fontSize="14" fill="var(--paper)">
        {HELD_ROWS.map((row) => (
          <g key={row.name}>
            <text x="30" y={row.y}>
              {row.name}
            </text>
            <rect x="206" y={row.y - 16} width="60" height="22" fill="var(--blue)" />
            <text x="236" y={row.y} textAnchor="middle" fontSize="12" fontWeight="500">
              Held
            </text>
          </g>
        ))}
        <text x="30" y="410">
          Maya Shah (you)
        </text>
        <rect x="196" y="394" width="70" height="22" fill="#393939" />
        <text x="231" y="410" textAnchor="middle" fontSize="12" fontWeight="500">
          Waiting
        </text>
      </g>
      <rect x="30" y="466" width="240" height="50" fill="var(--paper)" />
      <text x="150" y="496" textAnchor="middle" fontSize="14" fontWeight="500" fill="var(--ink)">
        Hold my share with PayPal →
      </text>
    </svg>
  );
}
