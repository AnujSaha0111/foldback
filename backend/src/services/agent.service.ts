import { when } from "../domain/reason";
import { AppError } from "../http/errors";
import { AGENT_SYSTEM_PROMPT, agentContext } from "../integrations/llm/agentPrompt";
import { runAgent } from "../integrations/llm/agentRunner";
import { budgetedDeps, hasUsableModel } from "../integrations/llm/client";
import type { ChatMessage } from "../integrations/llm/client";
import { findOwned } from "../repositories/contracts.repo";
import { hasEvent, listRecent } from "../repositories/events.repo";
import { listForContract } from "../repositories/shares.repo";
import type { AgentResponse } from "../shared/api-types";
import type { UsageContext } from "./aiBudget.service";
import { agentTools } from "./agentTools";
import type { AgentFacts } from "./agentTools";
import { budgetError } from "./extract.service";
import type { Requester, RuleDeps } from "./extract.service";

const EVENTS_FOR_AGENT = 20;
/** A turn usually takes two or three model steps; reserve them so it does not stop halfway. */
const AGENT_TURN_SLOTS = 3;
const UNAVAILABLE = "The assistant is unavailable right now. The board and buttons still work.";
const SALVAGED = "Here is what I prepared. Review it below.";

/** The facts the tools work from, read once. Only a confirmed plan has an assistant. */
async function factsFor(deps: RuleDeps, ownerId: string, contractId: string): Promise<AgentFacts> {
  const contract = await findOwned(deps.pool, ownerId, contractId);
  if (!contract) throw new AppError("not_found", "That plan does not exist.");
  const { headcount, deadlineAt, demoNow, timezone, title } = contract;
  if (headcount === null || !deadlineAt || !demoNow || !timezone || !title) {
    throw new AppError("not_confirmed", "Confirm the plan first. The assistant works on confirmed plans.");
  }
  const [shares, events, heldEver] = await Promise.all([
    listForContract(deps.pool, contractId),
    listRecent(deps.pool, contractId, EVENTS_FOR_AGENT),
    hasEvent(deps.pool, contractId, "hold_placed"),
  ]);
  return {
    contract: { ...contract, headcount, deadlineAt, demoNow, timezone, title },
    shares,
    events,
    heldEver,
  };
}

/**
 * One assistant turn. The client keeps the conversation and sends it whole. Proposals and drafts come back for the
 * organizer to act on: nothing here moves money or changes the plan.
 */
export async function askAgent(
  deps: RuleDeps,
  who: Requester,
  contractId: string,
  conversation: ChatMessage[],
): Promise<AgentResponse> {
  const facts = await factsFor(deps, who.userId, contractId);
  const allowance = await deps.budget.allow(AGENT_TURN_SLOTS);
  if (allowance !== "ok") throw budgetError(allowance);
  if (!hasUsableModel(deps.env)) throw new AppError("agent_unavailable", UNAVAILABLE);

  const { contract } = facts;
  const context: UsageContext = { route: "agent", userId: who.userId, contractId, ipHash: who.ipHash };
  const live = agentContext({
    id: contract.id,
    title: contract.title,
    status: contract.status,
    moneySource: contract.moneySource,
    now: when(contract.demoNow, contract.timezone),
  });
  const { tools, collected } = agentTools(facts, deps.env);
  const result = await runAgent(
    budgetedDeps(deps, context),
    `${AGENT_SYSTEM_PROMPT}\n\n${live}`,
    conversation,
    tools,
  );
  if (!result.ok) {
    // The steps ran out after work the organizer can still use: show it instead of an error.
    const salvaged = collected.drafts.length + collected.proposals.length > 0;
    if (result.reason === "unavailable" && salvaged) {
      return { reply: SALVAGED, tool_calls: [], proposals: collected.proposals, drafts: collected.drafts };
    }
    throw result.reason === "unavailable"
      ? new AppError("agent_unavailable", UNAVAILABLE)
      : budgetError(result.reason);
  }
  return {
    reply: result.value.reply,
    tool_calls: result.value.toolCalls,
    proposals: collected.proposals,
    drafts: collected.drafts,
  };
}
