// A stand-in API that answers only what the board screen asks for, so the board can be looked at without Postgres.
// Run it with: node deploy/mock-board-api.mjs   (listens on 8787; it has no sockets, so the board polls).
import { createServer } from "node:http";

const share = (id, name, status, extra = {}) => ({
  id,
  display_name: name,
  is_grace_subject: false,
  status,
  amount_cents: 8000,
  money_source: "sandbox",
  sample_label: null,
  order_id: null,
  authorization_id: null,
  authorization_expires_at: null,
  capture_id: null,
  payable: false,
  pay_path: `/pay/${id}`,
  ...extra,
});

const shares = [
  share("shr_a", "Alex Chen", "held", { authorization_id: "AUTH-1" }),
  share("shr_s", "Sam Ortiz", "held", { authorization_id: "AUTH-2" }),
  share("shr_j", "Jordan Lee", "held", { authorization_id: "AUTH-3" }),
  share("shr_m", "Maya Shah", "waiting", {
    is_grace_subject: true,
    payable: true,
  }),
];

const contract = {
  id: "con_mock",
  seed_key: null,
  title: "Cabin weekend",
  status: "active",
  money_source: "sandbox",
  headcount: 4,
  held_count: 3,
  kept_count: 0,
  released_count: 0,
  share_cents: 8000,
  deadline_at: "2026-11-07T02:00:00.000Z",
  demo_now: "2026-11-07T00:00:00.000Z",
  resolution_reason: null,
  direction: null,
  currency: "USD",
  total_cents: 32000,
  timezone: "America/Los_Angeles",
  grace_person_name: "Maya Shah",
  grace_until: "2026-11-10T02:00:00.000Z",
  clarification_question: null,
  extraction: null,
};

const START = "2026-11-06T08:00:00-08:00";
const DEADLINE = "2026-11-06T18:00:00-08:00";
const GRACE = "2026-11-09T18:00:00-08:00";

const bar = (s, name, color, startDate, endDate) => ({
  id: `${s.id}:state`,
  resourceId: s.id,
  name,
  status: s.status,
  startDate,
  endDate,
  eventColor: color,
  cls: null,
  moneySource: "sandbox",
  paypalId: s.authorization_id,
});

const projection = {
  timezone: "America/Los_Angeles",
  start: START,
  end: "2026-11-11T20:00:00-08:00",
  resources: shares.map((s) => ({
    id: s.id,
    name: s.display_name,
    badge: "Sandbox",
  })),
  events: [
    ...shares.slice(0, 3).map((s) => bar(s, "Held", "blue", START, DEADLINE)),
    bar(shares[3], "Waiting", "gray", START, GRACE),
  ],
  timeRanges: [
    {
      id: "deadline",
      name: "Deadline",
      startDate: DEADLINE,
      cls: "fb-deadline",
    },
    { id: "grace", name: "Grace ends", startDate: GRACE, cls: "fb-grace" },
    {
      id: "now",
      name: "Now",
      startDate: "2026-11-06T16:00:00-08:00",
      cls: "fb-now",
    },
  ],
};

const OPEN = ["waiting", "checkout_open", "declined"];

const publicShare = (status) => ({
  share_id: `shr_${status}`,
  contract_id: "con_mock",
  display_name: "Maya Shah",
  title: "Cabin weekend",
  amount_cents: 8000,
  currency: "USD",
  headcount: 4,
  held_count: status === "kept" || status === "held" ? 4 : 3,
  deadline_at: contract.deadline_at,
  grace_until: contract.grace_until,
  is_grace_subject: true,
  timezone: contract.timezone,
  demo_now: contract.demo_now,
  status: status === "sample" ? "waiting" : status,
  contract_status: "active",
  money_source: status === "sample" ? "sample" : "sandbox",
  payable: OPEN.includes(status),
  other_names: ["Alex Chen", "Sam Ortiz", "Jordan Lee"],
});

const user = {
  id: "usr_1",
  kind: "guest",
  email: null,
  display_name: "Guest",
  expires_at: null,
};

createServer((req, res) => {
  // Reflects the page's origin, so it works from any Codespace address. Only for local looking, never deployed.
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") return res.writeHead(204).end();
  res.setHeader("content-type", "application/json");
  const url = req.url ?? "";
  if (url.startsWith("/api/auth/me")) return res.end(JSON.stringify({ user }));
  if (url === "/api/contracts")
    return res.end(JSON.stringify({ contracts: [contract] }));
  if (url.endsWith("/scheduler")) return res.end(JSON.stringify(projection));
  // /api/shares/waiting, /api/shares/held, ...: the id picks the status, for looking at the Pay page.
  if (url.startsWith("/api/shares/"))
    return res.end(JSON.stringify(publicShare(url.split("/").pop())));
  if (url.startsWith("/api/contracts/con_mock"))
    return res.end(JSON.stringify({ contract, shares, events: [] }));
  res.writeHead(404).end(
    JSON.stringify({
      error: "not_found",
      message: "The mock has no such route.",
    }),
  );
}).listen(8787, () => console.log("mock board API on 8787"));
