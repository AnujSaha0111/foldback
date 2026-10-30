import type { Env } from "../../config/env";
import type { Logger } from "../../observability/logger";
import type { Allowance, UsedAttempt } from "../../services/aiBudget.service";

// The only file that makes language-model HTTP calls (docs/spec/ai.md). Plain fetch to OpenAI-compatible endpoints,
// so there is no SDK and no extra dependency.

type Provider = "gemini" | "groq" | "openrouter";

export interface ChainEntry {
  provider: Provider;
  model: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface JsonRequest {
  messages: ChatMessage[];
  /** Name and JSON Schema of the reply. Providers with strict support enforce it, the rest are told in the prompt. */
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  maxTokens: number;
}

export interface LlmDeps {
  env: Env;
  logger: Logger;
  /** Called before every attempt. Anything but "ok" stops the chain. */
  allow(): Promise<Allowance>;
  /** Called after every attempt, successful or not. */
  record(attempt: UsedAttempt): Promise<void>;
  fetch?: typeof fetch;
  /** Gives up on the whole chain after this long. Defaults to TOTAL_TIMEOUT_MS. */
  totalTimeoutMs?: number;
}

export type LlmResult<T> =
  | { ok: true; value: T; provider: Provider; model: string }
  | { ok: false; reason: "unavailable" | Exclude<Allowance, "ok"> };

/** A single attempt that is given up on after this long, so one slow provider cannot hold a request. */
const ATTEMPT_TIMEOUT_MS = 20_000;

/** The whole chain, all attempts together. Kept under the 100 seconds after which the Cloudflare tunnel drops a request. */
const TOTAL_TIMEOUT_MS = 60_000;

interface ProviderConfig {
  baseUrl: string;
  apiKey(env: Env): string | undefined;
  /** Groq's name for the output cap differs from the other two. */
  tokenField: "max_tokens" | "max_completion_tokens";
  /** Strict JSON-schema output. Without it the schema goes in the prompt and the reply is only asked to be JSON. */
  strictSchema: boolean;
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey: (env) => env.GEMINI_API_KEY,
    tokenField: "max_tokens",
    strictSchema: true,
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: (env) => env.GROQ_API_KEY,
    tokenField: "max_completion_tokens",
    strictSchema: true,
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: (env) => env.OPENROUTER_API_KEY,
    tokenField: "max_tokens",
    strictSchema: false,
  },
};

/** "gemini:model,groq:model" into entries. env.ts has already checked every entry. */
export function parseChain(chain: string): ChainEntry[] {
  return chain.split(",").map((raw) => {
    const entry = raw.trim();
    const at = entry.indexOf(":");
    return { provider: entry.slice(0, at) as Provider, model: entry.slice(at + 1) };
  });
}

/** True when the chain has at least one provider with a key, so a call can be attempted at all. */
export function hasUsableModel(env: Env): boolean {
  return parseChain(env.LLM_CHAIN).some((entry) => PROVIDERS[entry.provider].apiKey(env) !== undefined);
}

function buildBody(entry: ChainEntry, request: JsonRequest): Record<string, unknown> {
  const config = PROVIDERS[entry.provider];
  const strict = config.strictSchema;
  const [system, ...rest] = request.messages;
  const messages =
    strict || system === undefined
      ? request.messages
      : [
          {
            ...system,
            content: `${system.content}\n\nReply with only JSON that matches this JSON Schema:\n${JSON.stringify(request.jsonSchema)}`,
          },
          ...rest,
        ];
  return {
    model: entry.model,
    temperature: 0,
    reasoning_effort: "low",
    [config.tokenField]: request.maxTokens,
    messages,
    response_format: strict
      ? {
          type: "json_schema",
          json_schema: { name: request.schemaName, strict: true, schema: request.jsonSchema },
        }
      : { type: "json_object" },
  };
}

interface ChatReply {
  choices?: { finish_reason?: string; message?: { content?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

interface AttemptOutcome<T> {
  value: T | null;
  used: UsedAttempt;
}

/** The usable text of a reply. Null when it was cut off ("length"), withheld ("content_filter"), or empty. */
function replyText(body: ChatReply): string | null {
  const choice = body.choices?.[0];
  const content = choice?.message?.content;
  if (choice?.finish_reason === "length" || choice?.finish_reason === "content_filter") return null;
  return typeof content === "string" ? content : null;
}

/** One provider call. Never throws: every failure (network, timeout, bad status, bad reply) is an outcome with null. */
async function attempt<T>(
  deps: LlmDeps,
  entry: ChainEntry,
  apiKey: string,
  request: JsonRequest,
  parse: (content: string) => T | null,
  timeoutMs: number,
): Promise<AttemptOutcome<T>> {
  const started = Date.now();
  const used: UsedAttempt = { ...entry, inputTokens: 0, outputTokens: 0, succeeded: false };
  const log = deps.logger.child({ module: "llm", provider: entry.provider, model: entry.model });
  try {
    const response = await (deps.fetch ?? fetch)(`${PROVIDERS[entry.provider].baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(buildBody(entry, request)),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const remaining = response.headers.get("x-ratelimit-remaining-requests");
    if (!response.ok) {
      log.warn("provider refused", { status: response.status, ms: Date.now() - started, remaining });
      return { value: null, used };
    }
    const body = (await response.json()) as ChatReply;
    used.inputTokens = body.usage?.prompt_tokens ?? 0;
    used.outputTokens = body.usage?.completion_tokens ?? 0;
    const text = replyText(body);
    const value = text === null ? null : parse(text);
    used.succeeded = value !== null;
    log.info("attempt", { ok: used.succeeded, ms: Date.now() - started, remaining });
    return { value, used };
  } catch (error) {
    log.warn("attempt failed", {
      error: error instanceof Error ? error.name : "error",
      ms: Date.now() - started,
    });
    return { value: null, used };
  }
}

/**
 * Tries each model of the chain in order until one returns a reply that parses. A refusal, a rate limit, a server
 * error, a timeout, a cut-off reply, or a reply the parser rejects all move on to the next model. Every attempt is
 * counted against the daily cap and recorded. Providers without a key are skipped without being called.
 */
export async function callChain<T>(
  deps: LlmDeps,
  request: JsonRequest,
  parse: (content: string) => T | null,
): Promise<LlmResult<T>> {
  const endsAt = Date.now() + (deps.totalTimeoutMs ?? TOTAL_TIMEOUT_MS);
  for (const entry of parseChain(deps.env.LLM_CHAIN)) {
    const apiKey = PROVIDERS[entry.provider].apiKey(deps.env);
    if (apiKey === undefined) continue;
    const timeLeft = endsAt - Date.now();
    if (timeLeft <= 0) break;
    const allowance = await deps.allow();
    if (allowance !== "ok") return { ok: false, reason: allowance };

    const outcome = await attempt(
      deps,
      entry,
      apiKey,
      request,
      parse,
      Math.min(ATTEMPT_TIMEOUT_MS, timeLeft),
    );
    try {
      await deps.record(outcome.used);
    } catch (error) {
      // The reply is still good. A failed accounting write must not throw it away.
      deps.logger.error("could not record an AI attempt", { module: "llm", error: String(error) });
    }
    if (outcome.value !== null) return { ok: true, value: outcome.value, ...entry };
  }
  return { ok: false, reason: "unavailable" };
}
