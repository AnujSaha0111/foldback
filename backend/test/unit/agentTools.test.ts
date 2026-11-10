import { agentTools, simulate } from "../../src/services/agentTools";
import type { AgentFacts } from "../../src/services/agentTools";
import type { ShareRow } from "../../src/repositories/shares.repo";
import { testEnv } from "../helpers/env";

const DEADLINE = new Date("2026-11-07T02:00:00Z");
const GRACE_END = new Date("2026-11-10T02:00:00Z");

function share(i: number, name: string, status: ShareRow["status"], grace = false): ShareRow {
  return {
    id: `shr_${String(i).padStart(22, "a")}`,
    displayName: name,
    isGraceSubject: grace,
    status,
    amountCents: 8000,
    moneySource: "sandbox",
    sampleLabel: null,
    orderId: null,
    authorizationId: status === "held" ? `AUTH${i}` : null,
    authorizationExpiresAt: null,
    captureId: null,
  };
}

/** The cabin: three held, Maya waiting with grace, the clock two hours before the deadline. */
function facts(extra: Partial<AgentFacts> = {}): AgentFacts {
  return {
    contract: {
      id: "con_1",
      seedKey: null,
      title: "Cabin weekend",
      status: "active",
      direction: null,
      moneySource: "sandbox",
      currency: "USD",
      totalCents: 32000,
      shareCents: 8000,
      headcount: 4,
      heldCount: 3,
      keptCount: 0,
      releasedCount: 0,
      deadlineAt: DEADLINE,
      timezone: "America/Los_Angeles",
      graceName: "Maya Shah",
      graceUntil: GRACE_END,
      demoNow: new Date("2026-11-07T00:00:00Z"),
      resolutionReason: null,
      clarificationQuestion: null,
      extraction: null,
      version: 1,
    },
    shares: [
      share(1, "Alex Chen", "held"),
      share(2, "Sam Ortiz", "held"),
      share(3, "Jordan Lee", "held"),
      share(4, "Maya Shah", "waiting", true),
    ],
    events: [],
    heldEver: true,
    ...extra,
  };
}

function tool(name: string, f: AgentFacts = facts()) {
  const made = agentTools(f, testEnv({ APP_BASE_URL: "https://app.example.com" }));
  const found = made.tools.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`no tool ${name}`);
  return { run: (input: unknown) => found.run(input), collected: made.collected };
}

describe("simulate_outcome (tests 76 and 77)", () => {
  it("releases three at grace end with Maya unpaid, and moves nothing", async () => {
    const before = JSON.stringify(facts());
    const { run } = tool("simulate_outcome");
    const outcome = await run({ at: "grace_end", assume_held: [], assume_not_paying: ["maya shah"] });
    expect(outcome).toMatchObject({
      ok: true,
      summary: "Simulated Mon 9 Nov, 6:00pm PT with Maya Shah unpaid",
      result: {
        decision: "release",
        paypal_calls: { captures: 0, voids: 3 },
        people: [
          { name: "Alex Chen", status: "Released" },
          { name: "Sam Ortiz", status: "Released" },
          { name: "Jordan Lee", status: "Released" },
          { name: "Maya Shah", status: "Missed deadline" },
        ],
      },
    });
    expect(JSON.stringify(outcome)).toContain("Nobody was charged");
    expect(JSON.stringify(facts())).toBe(before);
  });

  it("keeps everyone when Maya is assumed to pay, with four captures", () => {
    const f = facts();
    const maya = f.shares[3] as ShareRow;
    expect(simulate(f, DEADLINE, [maya])).toMatchObject({
      decision: "keep",
      paypal_calls: { captures: 4, voids: 0 },
    });
  });

  it("enters grace at the deadline, and calls nothing on a sample plan", () => {
    const sample = facts({ contract: { ...facts().contract, moneySource: "sample" } });
    expect(simulate(sample, DEADLINE, [])).toMatchObject({
      decision: "enter_grace",
      paypal_calls: { captures: 0, voids: 0 },
    });
  });
});

describe("names are never guessed (test 81)", () => {
  it("answers an unknown name with the valid names", async () => {
    const { run } = tool("simulate_outcome");
    const outcome = await run({ at: "deadline", assume_held: ["Mia"], assume_not_paying: [] });
    expect(outcome).toEqual({
      ok: false,
      error: 'No one is called "Mia". The people are: Alex Chen, Sam Ortiz, Jordan Lee, Maya Shah.',
    });
  });
});

describe("draft_reminder (test 78)", () => {
  it("refuses someone who cannot pay", async () => {
    const { run, collected } = tool("draft_reminder");
    expect(await run({ person: "Alex Chen", message: "Hi" })).toMatchObject({ ok: false });
    expect(collected.drafts).toEqual([]);
  });

  it("adds Maya's pay link to her draft", async () => {
    const { run, collected } = tool("draft_reminder");
    expect(await run({ person: "maya shah", message: "Hey Maya, it's only a hold." })).toMatchObject({
      ok: true,
    });
    const [draft] = collected.drafts;
    expect(draft?.pay_url).toBe(`https://app.example.com/pay/${facts().shares[3]?.id ?? ""}`);
    expect(draft?.text).toContain(draft?.pay_url ?? "missing");
  });
});

describe("propose_action (tests 79 and 80)", () => {
  it("records a proposal with its preview, and executes nothing", async () => {
    const f = facts();
    const { run, collected } = tool("propose_action", f);
    const outcome = await run({ kind: "move_clock", to: "grace_end", why: "Maya's grace ends then." });
    expect(outcome).toMatchObject({ ok: true });
    // The model never sees the id, so it cannot repeat it to the organizer (AI-010).
    expect(JSON.stringify(outcome)).not.toContain("prop_1");
    const [proposal] = collected.proposals;
    expect(proposal).toMatchObject({
      id: "prop_1",
      kind: "move_clock",
      label: "Advance to grace end (Mon 9 Nov, 6:00pm PT)",
      demo_now: GRACE_END.toISOString(),
    });
    expect(proposal?.preview).toContain("If approved: 3 of 4 were held");
    expect(f.contract.demoNow).toEqual(new Date("2026-11-07T00:00:00Z"));
  });

  it("refuses a backward move after a hold, as the clock route does", async () => {
    const { run, collected } = tool("propose_action");
    const outcome = await run({ kind: "move_clock", to: "2026-11-01T00:00:00Z", why: "rewind" });
    expect(outcome).toMatchObject({ ok: false });
    expect(collected.proposals).toEqual([]);
  });

  it("refuses anything on a decided plan", async () => {
    const decided = facts({ contract: { ...facts().contract, status: "released", direction: "release" } });
    expect(await tool("propose_action", decided).run({ kind: "resolve", why: "again" })).toMatchObject({
      ok: false,
    });
  });
});
