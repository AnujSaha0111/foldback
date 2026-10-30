/** The cabin weekend from docs/spec/demo.md, as the landing page shows it. Illustration only, no request is made. */
export const SAMPLE = {
  title: "Cabin weekend",
  shareCents: 8000,
  deadline: "2026-11-07T02:00:00.000Z",
  timeZone: "America/Los_Angeles",
  people: [
    { name: "Alex Chen", holds: true, note: null },
    { name: "Sam Ortiz", holds: true, note: null },
    { name: "Jordan Lee", holds: true, note: null },
    { name: "Maya Shah", holds: false, note: "until Mon 9 Nov" },
  ],
} as const;
