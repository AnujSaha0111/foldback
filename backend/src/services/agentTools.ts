import { z } from "zod";
import type { Env } from "../config/env";
import { decide } from "../domain/decide";
import type { Decision } from "../domain/decide";
import { isPayable } from "../domain/payable";
import { statusWord } from "../domain/projection";
import { reasons, when } from "../domain/reason";
import { OPEN_SHARE_STATUSES } from "../domain/statuses";
import type { ShareStatus } from "../domain/statuses";
import type { AgentTool, ToolOutcome } from "../integrations/llm/agentRunner";
import type { ContractRow } from "../repositories/contracts.repo";
import type { EventRow } from "../repositories/events.repo";
import type { ShareRow } from "../repositories/shares.repo";
import type { AgentDraft, AgentProposal } from "../shared/api-types";

// The organizer agent's tools (ai.md, Job 2). Every one works on facts read before the loop starts. None writes to
// the database or calls PayPal: an action only becomes a proposal or a draft that the organizer acts on.

/** A confirmed plan as the tools see it. */
export interface AgentFacts {
  contract: ContractRow & {
    headcount: number;
    deadlineAt: Date;
    demoNow: Date;
    timezone: string;
    title: string;
  };
  shares: ShareRow[];
  events: EventRow[];
  /** A real hold was ever placed, so the clock may not move backward (the clock route's rule). */
  heldEver: boolean;
}

export interface Collected {
  proposals: AgentProposal[];
  drafts: AgentDraft[];
}

const MAX_MESSAGE = 600;
const TimeInput = z.union([z.enum(["deadline", "grace_end"]), z.iso.datetime({ offset: true })]);

const fail = (error: string): ToolOutcome => ({ ok: false, error });

function findPerson(facts: AgentFacts, name: string): ShareRow | string {
  const share = facts.shares.find(
    (candidate) => candidate.displayName.toLowerCase() === name.trim().toLowerCase(),
  );
  return (
    share ??
    `No one is called "${name}". The people are: ${facts.shares.map((s) => s.displayName).join(", ")}.`
  );
}

function resolveTime(facts: AgentFacts, at: z.infer<typeof TimeInput>): Date | string {
  if (at === "deadline") return facts.contract.deadlineAt;
  if (at === "grace_end") return facts.contract.graceUntil ?? "This plan has no grace period.";
  return new Date(at);
}

interface Simulation {
  decision: Decision["kind"];
  people: { name: string; status: string }[];
  paypal_calls: { captures: number; voids: number };
  reason: string;
}

/** What each share would become under a decision. Nothing is written: this is the same rule on a copy. */
function outcomeOf(decision: Decision, share: ShareRow & { status: ShareStatus }): ShareStatus {
  if (decision.kind === "keep" && share.status === "held") return "kept";
  if (decision.kind === "release" && share.status === "held") return "released";
  const expire = decision.kind === "release" || decision.kind === "enter_grace" ? decision.expire : [];
  return expire.includes(share.id) ? "expired" : share.status;
}

function releaseSentence({ contract }: AgentFacts, at: Date, held: number): string {
  const graceEnded = contract.graceName !== null && contract.graceUntil !== null && at >= contract.graceUntil;
  return graceEnded && contract.graceName
    ? reasons.releasedAtGraceEnd(held, contract.headcount, contract.graceName)
    : reasons.releasedAtDeadline(held, contract.headcount);
}

function sentence(facts: AgentFacts, decision: Decision, at: Date, held: number): string {
  const { contract } = facts;
  const zone = contract.timezone;
  switch (decision.kind) {
    case "keep":
      return reasons.kept(contract.headcount);
    case "release":
      return releaseSentence(facts, at, held);
    case "enter_grace":
      return reasons.grace(held, contract.headcount, decision.graceName, contract.graceUntil ?? at, zone);
    case "stay_active":
      return `Nothing happens yet. ${held} of ${contract.headcount} are held, and the deadline is ${when(contract.deadlineAt, zone)}.`;
    case "unknown":
      return reasons.unknown(decision.who);
    case "capture_refused":
      return contract.resolutionReason ?? "Foldback is paused.";
    case "closed":
      return "This plan is already decided. Nothing more happens.";
  }
}

/**
 * Runs the real rule on an in-memory copy: the people the organizer assumes will pay count as held, and the people
 * assumed not to pay count as waiting, even if they hold today.
 */
export function simulate(
  facts: AgentFacts,
  at: Date,
  assumeHeld: ShareRow[],
  assumeNotPaying: ShareRow[] = [],
): Simulation {
  const statusOf = (share: ShareRow): ShareRow["status"] => {
    if (assumeNotPaying.includes(share)) return "waiting";
    return assumeHeld.includes(share) && OPEN_SHARE_STATUSES.includes(share.status) ? "held" : share.status;
  };
  const shares = facts.shares.map((share) => ({ ...share, status: statusOf(share), openCall: false }));
  const decision = decide({ ...facts.contract, demoNow: at } as typeof facts.contract, shares, at);
  const held = shares.filter((share) => share.status === "held").length;
  const real = facts.contract.moneySource === "sandbox";
  return {
    decision: decision.kind,
    people: shares.map((share) => ({
      name: share.displayName,
      status: statusWord(outcomeOf(decision, share)),
    })),
    paypal_calls: {
      captures: real && decision.kind === "keep" ? held : 0,
      voids: real && decision.kind === "release" ? held : 0,
    },
    reason: sentence(facts, decision, at, held),
  };
}

function people(facts: AgentFacts, names: string[]): ShareRow[] | string {
  const found = names.map((name) => findPerson(facts, name));
  const missing = found.find((item): item is string => typeof item === "string");
  return missing ?? (found as ShareRow[]);
}

function statusTool(facts: AgentFacts): AgentTool {
  const { contract } = facts;
  const zone = contract.timezone;
  return {
    name: "get_status",
    description:
      "The plan's status, terms, demo clock, and each person's status and whether they can pay now.",
    input: z.strictObject({}),
    run: () =>
      Promise.resolve({
        ok: true,
        summary: "Read the plan",
        result: {
          title: contract.title,
          status: contract.status,
          direction: contract.direction,
          money: contract.moneySource === "sample" ? "sample, no real PayPal holds" : "PayPal sandbox holds",
          share_each: `$${((contract.shareCents ?? 0) / 100).toFixed(2)}`,
          deadline: when(contract.deadlineAt, zone),
          grace:
            contract.graceName && contract.graceUntil
              ? `${contract.graceName} until ${when(contract.graceUntil, zone)}`
              : null,
          now: when(contract.demoNow, zone),
          people: facts.shares.map((share) => ({
            name: share.displayName,
            status: statusWord(share.status),
            can_pay_now: isPayable(contract, share),
          })),
          resolution_reason: contract.resolutionReason,
        },
      }),
  };
}

function activityTool(facts: AgentFacts): AgentTool {
  return {
    name: "get_activity",
    description: "The plan's most recent events, newest first.",
    input: z.strictObject({ limit: z.number().int().min(1).max(20) }),
    run: (input) => {
      const { limit } = input as { limit: number };
      const names = new Map(facts.shares.map((share) => [share.id, share.displayName]));
      const result = facts.events.slice(0, limit).map((event) => ({
        when: when(event.createdAt, facts.contract.timezone),
        person: event.shareId ? (names.get(event.shareId) ?? null) : null,
        detail: event.detail,
      }));
      return Promise.resolve({ ok: true, result, summary: `Read the last ${limit} events` });
    },
  };
}

function simulateTool(facts: AgentFacts): AgentTool {
  return {
    name: "simulate_outcome",
    description:
      'What the rule would do at a time ("deadline", "grace_end", or an ISO time), counting assume_held as held and assume_not_paying as unpaid. Moves nothing.',
    input: z.strictObject({
      at: TimeInput,
      assume_held: z.array(z.string()).max(4),
      assume_not_paying: z.array(z.string()).max(4),
    }),
    run: (input) => {
      const { at, assume_held, assume_not_paying } = input as {
        at: z.infer<typeof TimeInput>;
        assume_held: string[];
        assume_not_paying: string[];
      };
      const time = resolveTime(facts, at);
      if (typeof time === "string") return Promise.resolve(fail(time));
      const held = people(facts, assume_held);
      const notPaying = people(facts, assume_not_paying);
      if (typeof held === "string") return Promise.resolve(fail(held));
      if (typeof notPaying === "string") return Promise.resolve(fail(notPaying));
      if (notPaying.some((share) => held.includes(share))) {
        return Promise.resolve(fail("A person cannot be both assumed to pay and assumed not to pay."));
      }
      const unpaid = notPaying.map((share) => share.displayName).join(", ");
      const summary = `Simulated ${when(time, facts.contract.timezone)}${unpaid ? ` with ${unpaid} unpaid` : ""}`;
      return Promise.resolve({ ok: true, result: simulate(facts, time, held, notPaying), summary });
    },
  };
}

function reminderTool(facts: AgentFacts, env: Env, collected: Collected): AgentTool {
  return {
    name: "draft_reminder",
    description: "A friendly reminder for one person who can still pay. Their pay link is added for you.",
    input: z.strictObject({ person: z.string(), message: z.string().min(1).max(MAX_MESSAGE) }),
    run: (input) => {
      const { person, message } = input as { person: string; message: string };
      const share = findPerson(facts, person);
      if (typeof share === "string") return Promise.resolve(fail(share));
      if (!isPayable(facts.contract, share)) {
        return Promise.resolve(fail(`${share.displayName} cannot pay now, so no reminder is needed.`));
      }
      const payUrl = new URL(`/pay/${share.id}`, env.APP_BASE_URL).href;
      const text = message.includes(payUrl) ? message : `${message}\n${payUrl}`;
      collected.drafts.push({ share_id: share.id, display_name: share.displayName, text, pay_url: payUrl });
      return Promise.resolve({
        ok: true,
        result: { ok: true, pay_url: payUrl },
        summary: `Drafted a reminder for ${share.displayName}`,
      });
    },
  };
}

function proposeTool(facts: AgentFacts, collected: Collected): AgentTool {
  const { contract } = facts;
  return {
    name: "propose_action",
    description:
      'Propose moving the demo clock (to "deadline", "grace_end" or an ISO time) or running resolve. The organizer approves it.',
    input: z.strictObject({
      kind: z.enum(["move_clock", "resolve"]),
      to: TimeInput.optional(),
      why: z.string().max(300),
    }),
    run: (input) => {
      const { kind, to } = input as { kind: "move_clock" | "resolve"; to?: z.infer<typeof TimeInput> };
      if (contract.status === "kept" || contract.status === "released") {
        return Promise.resolve(fail("This plan is already decided, so there is nothing to propose."));
      }
      const time =
        kind === "resolve" ? contract.demoNow : to ? resolveTime(facts, to) : "A clock move needs a time.";
      if (typeof time === "string") return Promise.resolve(fail(time));
      if (time < contract.demoNow && facts.heldEver) {
        return Promise.resolve(fail("The demo clock cannot move backward after a payment was held."));
      }
      const preview = simulate(facts, time, []);
      const target =
        to === "deadline"
          ? "Advance to deadline"
          : to === "grace_end"
            ? "Advance to grace end"
            : "Move the clock";
      const label = kind === "resolve" ? "Resolve now" : `${target} (${when(time, contract.timezone)})`;
      const proposal: AgentProposal = {
        id: `prop_${collected.proposals.length + 1}`,
        kind,
        label,
        demo_now: kind === "move_clock" ? time.toISOString() : null,
        preview: `If approved: ${preview.reason}`,
      };
      collected.proposals.push(proposal);
      return Promise.resolve({
        ok: true,
        result: { ok: true, preview },
        summary: `Proposed: ${label}`,
      });
    },
  };
}

/** The five tools for one plan, and where the proposals and drafts they make are collected. */
export function agentTools(facts: AgentFacts, env: Env): { tools: AgentTool[]; collected: Collected } {
  const collected: Collected = { proposals: [], drafts: [] };
  return {
    tools: [
      statusTool(facts),
      activityTool(facts),
      simulateTool(facts),
      reminderTool(facts, env, collected),
      proposeTool(facts, collected),
    ],
    collected,
  };
}
