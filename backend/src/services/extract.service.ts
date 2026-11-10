import { createHash } from "node:crypto";
import type { Pool } from "pg";
import type { Env } from "../config/env";
import { withTransaction } from "../db/tx";
import { ExtractionSchema } from "../domain/extraction";
import type { Extraction } from "../domain/extraction";
import { validateExtraction } from "../domain/validateExtraction";
import { AppError } from "../http/errors";
import { callChain, hasUsableModel, parseChain } from "../integrations/llm/client";
import {
  buildExtractionMessages,
  EXTRACTION_JSON_SCHEMA,
  parseExtractionReply,
} from "../integrations/llm/extractPrompt";
import type { Logger } from "../observability/logger";
import type { Notifier } from "../realtime/notify";
import {
  countConfirmedPlans,
  countOwnPlans,
  deleteDraft,
  findCachedExtraction,
  findOwnedDraft,
  insertDraft,
  lockDraft,
  returnToClarification,
  saveReading,
  startClarification,
} from "../repositories/contracts.repo";
import type { DraftContract } from "../repositories/contracts.repo";
import { insertEvent } from "../repositories/events.repo";
import {
  CLARIFY_FALLBACK_QUESTION,
  CLARIFY_LIMIT_MESSAGE,
  FIXTURE_REFERENCE_AT,
  FIXTURE_TEXTS,
  MAX_CLARIFY_ROUNDS,
  MAX_CONTRACTS_PER_USER,
  MAX_DEMO_CONTRACTS,
  MAX_PLANS_PER_GUEST,
} from "../shared/rules";
import type { AiBudget, Allowance, UsageContext } from "./aiBudget.service";

export interface RuleDeps {
  env: Env;
  pool: Pool;
  logger: Logger;
  budget: AiBudget;
  notifier: Notifier;
  /** Replaces the global fetch. Tests use it so no model is ever called over the network. */
  llmFetch?: typeof fetch;
  /** The clock for "when was this pasted". Tests pass a fixed one. */
  now?: () => Date;
}

export interface Requester {
  userId: string;
  kind: "member" | "guest";
  ipHash: string;
}

/** What the rule reader made of the text. `complete` means it can be confirmed. */
export type RuleOutcome =
  | { complete: true; contractId: string; extraction: Extraction }
  | { complete: false; contractId: string; extraction: Extraction | null; question: string };

interface Reading {
  extraction: Extraction | null;
  complete: boolean;
  question: string | null;
}

interface Draft {
  id: string;
  ruleText: string;
  referenceAt: Date;
  isNew: boolean;
}

const CACHE_HOURS = 24;
const MAX_STORED_EVENT_DETAIL = 500;
const EXHAUSTED_MESSAGE =
  "Today's free AI quota for this demo is used up. Try the sample plans, the board, and pay links. They still work.";
const BUSY_MESSAGE =
  "The demo's AI is busy for a moment. Try again in a minute. The board and pay links still work.";
const MAX_REPLY_TOKENS = 2000;

/** sha256(rule_text || reference_at): the key of the repeat-paste cache and the value stored in rule_hash. */
function ruleHash(ruleText: string, referenceAt: Date): string {
  return createHash("sha256").update(ruleText).update(referenceAt.toISOString()).digest("hex");
}

export function budgetError(reason: Exclude<Allowance, "ok">): AppError {
  if (reason === "busy") {
    return new AppError("rate_limited", BUSY_MESSAGE, undefined, { "Retry-After": "60" });
  }
  return new AppError("ai_budget_exhausted", EXHAUSTED_MESSAGE);
}

/** A reading from the cache: the same text pasted at the same moment, read before by anyone in the last day. */
async function cachedReading(deps: RuleDeps, hash: string): Promise<Reading | null> {
  const stored = ExtractionSchema.safeParse(await findCachedExtraction(deps.pool, hash, CACHE_HOURS));
  if (!stored.success) return null;
  return toReading({ extraction: stored.data, complete: stored.data.missing.length === 0 });
}

function toReading(validated: { extraction: Extraction; complete: boolean }): Reading {
  return {
    extraction: validated.extraction,
    complete: validated.complete,
    question: validated.complete ? null : validated.extraction.clarification_question,
  };
}

/** Everything that can refuse a model call, checked before any plan is created or changed. */
async function requireModel(deps: RuleDeps): Promise<void> {
  const allowance = await deps.budget.allow();
  if (allowance !== "ok") throw budgetError(allowance);
  if (!hasUsableModel(deps.env)) throw new AppError("internal", "No language model key is configured.");
}

async function askModel(deps: RuleDeps, who: Requester, draft: Draft): Promise<Reading> {
  const context: UsageContext = {
    route: "extract",
    userId: who.userId,
    contractId: draft.id,
    ipHash: who.ipHash,
  };
  const result = await callChain(
    {
      env: deps.env,
      logger: deps.logger,
      allow: () => deps.budget.allow(),
      record: (attempt) => deps.budget.record(context, attempt),
      ...(deps.llmFetch ? { fetch: deps.llmFetch } : {}),
    },
    {
      messages: buildExtractionMessages(draft.ruleText, draft.referenceAt),
      schemaName: "foldback_rule",
      jsonSchema: EXTRACTION_JSON_SCHEMA,
      maxTokens: MAX_REPLY_TOKENS,
    },
    parseExtractionReply,
  );
  if (result.ok) {
    return toReading(
      validateExtraction(result.value, { ruleText: draft.ruleText, referenceAt: draft.referenceAt }),
    );
  }
  // Every model failed: ask the organizer to restate the rule, instead of failing the request.
  if (result.reason === "unavailable") {
    return { extraction: null, complete: false, question: CLARIFY_FALLBACK_QUESTION };
  }
  throw budgetError(result.reason);
}

/** Stores the reading and its history line in one transaction, then tells the browser. */
async function saveAndAnnounce(deps: RuleDeps, draft: Draft, reading: Reading): Promise<RuleOutcome> {
  const question = reading.question ?? CLARIFY_FALLBACK_QUESTION;
  const version = await withTransaction(deps.pool, async (client) => {
    const saved = await saveReading(client, draft.id, {
      status: reading.complete ? "awaiting_confirmation" : "needs_clarification",
      extraction: reading.extraction,
      question: reading.complete ? null : question,
    });
    if (saved === null) throw new AppError("not_found", "That plan no longer exists.");
    await insertEvent(client, {
      contractId: draft.id,
      type: reading.complete ? "rule_extracted" : "clarification_requested",
      detail: reading.complete
        ? "The rule was read and is waiting for confirmation."
        : question.slice(0, MAX_STORED_EVENT_DETAIL),
    });
    return saved;
  });
  deps.notifier.contractChanged(draft.id, version);
  if (reading.complete && reading.extraction) {
    return { complete: true, contractId: draft.id, extraction: reading.extraction };
  }
  return { complete: false, contractId: draft.id, extraction: reading.extraction, question };
}

/** Reads the text (from the cache or the model) and stores the result. Puts the plan back if the model cannot be used. */
async function readAndStore(
  deps: RuleDeps,
  who: Requester,
  draft: Draft,
  cached: Reading | null,
): Promise<RuleOutcome> {
  try {
    if (cached) {
      const [served] = parseChain(deps.env.LLM_CHAIN);
      if (served) {
        const context = {
          route: "extract" as const,
          userId: who.userId,
          contractId: draft.id,
          ipHash: who.ipHash,
        };
        await deps.budget.recordCacheHit(context, served);
      }
    }
    return await saveAndAnnounce(deps, draft, cached ?? (await askModel(deps, who, draft)));
  } catch (error) {
    // A plan must not stay stuck in `extracting`: a new one is removed, an answered one goes back to asking.
    const cleanup = draft.isNew
      ? deleteDraft(deps.pool, draft.id)
      : returnToClarification(deps.pool, draft.id);
    await cleanup.catch((err: unknown) =>
      deps.logger.error("could not clean up a plan", { err: String(err) }),
    );
    throw error;
  }
}

async function enforcePlanCaps(pool: Pool, who: Requester): Promise<void> {
  const most = who.kind === "guest" ? MAX_PLANS_PER_GUEST : MAX_CONTRACTS_PER_USER;
  if ((await countOwnPlans(pool, who.userId)) >= most) {
    throw new AppError("rate_limited", `You can have up to ${most} plans. Use an existing one.`);
  }
  if ((await countConfirmedPlans(pool)) >= MAX_DEMO_CONTRACTS) {
    throw new AppError("demo_full", "The demo is full right now. Try the sample plans.");
  }
}

/** Creates a plan from pasted text and reads it. `useFixtureTime` is honoured only for the three demo texts. */
export async function createContract(
  deps: RuleDeps,
  who: Requester,
  input: { ruleText: string; useFixtureTime: boolean },
): Promise<RuleOutcome> {
  await enforcePlanCaps(deps.pool, who);
  const useFixture = input.useFixtureTime && FIXTURE_TEXTS.includes(input.ruleText);
  const referenceAt = useFixture ? new Date(FIXTURE_REFERENCE_AT) : (deps.now ?? (() => new Date()))();
  const cached = await cachedReading(deps, ruleHash(input.ruleText, referenceAt));
  if (!cached) await requireModel(deps);
  const id = await insertDraft(deps.pool, {
    ownerId: who.userId,
    ruleText: input.ruleText,
    ruleHash: ruleHash(input.ruleText, referenceAt),
    referenceAt,
  });
  return readAndStore(deps, who, { id, ruleText: input.ruleText, referenceAt, isNew: true }, cached);
}

function assertCanClarify(contract: DraftContract): void {
  if (contract.status === "extracting") {
    throw new AppError("resolve_in_progress", "This plan is still being read. Wait a moment.");
  }
  if (contract.status !== "needs_clarification") {
    throw new AppError("contract_closed", "This plan is not waiting for an answer.");
  }
  if (contract.clarifyRounds >= MAX_CLARIFY_ROUNDS) {
    throw new AppError("needs_clarification", CLARIFY_LIMIT_MESSAGE);
  }
}

/** The organizer's answer is added to the text and the whole text is read again. */
export async function clarifyContract(
  deps: RuleDeps,
  who: Requester,
  contractId: string,
  answer: string,
): Promise<RuleOutcome> {
  // The model is checked before anything changes, so a refused call does not use up a clarify round. This runs
  // before the transaction so that no connection is held while waiting for another one from the pool.
  const seen = await findOwnedDraft(deps.pool, who.userId, contractId);
  if (!seen) throw new AppError("not_found", "That plan does not exist.");
  assertCanClarify(seen);
  const ruleText = `${seen.ruleText}\n\nOrganizer: ${answer}`;
  const hash = ruleHash(ruleText, seen.referenceAt);
  const cached = await cachedReading(deps, hash);
  if (!cached) await requireModel(deps);

  const draft = await withTransaction(deps.pool, async (client) => {
    const contract = await lockDraft(client, who.userId, contractId);
    if (!contract) throw new AppError("not_found", "That plan does not exist.");
    assertCanClarify(contract);
    if (contract.ruleText !== seen.ruleText) {
      throw new AppError("resolve_in_progress", "This plan changed while you were answering. Try again.");
    }
    await startClarification(client, contract.id, { ruleText, ruleHash: hash });
    await insertEvent(client, {
      contractId: contract.id,
      type: "clarification_answered",
      detail: `Organizer: ${answer}`.slice(0, MAX_STORED_EVENT_DETAIL),
    });
    return { id: contract.id, ruleText, referenceAt: contract.referenceAt, isNew: false };
  });
  return readAndStore(deps, who, draft, cached);
}
