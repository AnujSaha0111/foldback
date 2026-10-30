import { PassThrough } from "node:stream";
import { callChain, parseChain } from "../../src/integrations/llm/client";
import type { LlmDeps } from "../../src/integrations/llm/client";
import { createLogger } from "../../src/observability/logger";
import type { Allowance, UsedAttempt } from "../../src/services/aiBudget.service";
import { testEnv } from "../helpers/env";
import { scripted } from "../helpers/llmStub";
import type { Step } from "../helpers/llmStub";

const REQUEST = {
  messages: [
    { role: "system" as const, content: "System text" },
    { role: "user" as const, content: "User text" },
  ],
  schemaName: "plan",
  jsonSchema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
  maxTokens: 2000,
};

const KEYS = {
  GEMINI_API_KEY: "gem-secret-key",
  GROQ_API_KEY: "groq-secret-key",
  OPENROUTER_API_KEY: "or-secret-key",
};

function setup(options: {
  env?: Record<string, string | undefined>;
  steps: Step[];
  allow?: () => Allowance;
}) {
  const logs = new PassThrough();
  let logged = "";
  logs.on("data", (chunk: Buffer) => (logged += chunk.toString()));
  const { fetch, calls } = scripted(options.steps);
  const recorded: UsedAttempt[] = [];
  const deps: LlmDeps = {
    env: testEnv({ ...KEYS, ...options.env }),
    logger: createLogger({ level: "debug", json: true, stream: logs }),
    allow: () => Promise.resolve(options.allow?.() ?? "ok"),
    record: (attempt) => {
      recorded.push(attempt);
      return Promise.resolve();
    },
    fetch,
  };
  return { deps, calls, recorded, logged: () => logged };
}

const parse = (content: string): { ok: boolean } | null => {
  try {
    const value = JSON.parse(content) as { ok?: unknown };
    return typeof value.ok === "boolean" ? { ok: value.ok } : null;
  } catch {
    return null;
  }
};

const CHAIN =
  "gemini:gemini-3.8-flash,gemini:gemini-3.6-flash,groq:openai/gpt-oss-120b,groq:openai/gpt-oss-20b,openrouter:openrouter/free";

describe("parseChain", () => {
  it("splits provider and model, keeping slashes and colons in the model", () => {
    expect(parseChain("groq:openai/gpt-oss-120b, openrouter:vendor/model:free")).toEqual([
      { provider: "groq", model: "openai/gpt-oss-120b" },
      { provider: "openrouter", model: "vendor/model:free" },
    ]);
  });
});

describe("a successful call", () => {
  it("sends the request the providers expect and returns the parsed value", async () => {
    const { deps, calls, recorded } = setup({ steps: [{}] });
    const result = await callChain(deps, REQUEST, parse);

    expect(result).toEqual({ ok: true, value: { ok: true }, provider: "gemini", model: "gemini-3.8-flash" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(calls[0]?.headers["Authorization"]).toBe("Bearer gem-secret-key");
    expect(calls[0]?.body).toMatchObject({
      model: "gemini-3.8-flash",
      temperature: 0,
      reasoning_effort: "low",
      max_tokens: 2000,
      messages: REQUEST.messages,
      response_format: {
        type: "json_schema",
        json_schema: { name: "plan", strict: true, schema: REQUEST.jsonSchema },
      },
    });
    expect(recorded).toEqual([
      { provider: "gemini", model: "gemini-3.8-flash", inputTokens: 120, outputTokens: 30, succeeded: true },
    ]);
  });

  it("uses Groq's token field name", async () => {
    const { deps, calls } = setup({
      env: { LLM_CHAIN: "groq:openai/gpt-oss-120b" },
      steps: [{}],
    });
    await callChain(deps, REQUEST, parse);
    expect(calls[0]?.url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(calls[0]?.body).toMatchObject({ max_completion_tokens: 2000 });
    expect(calls[0]?.body).not.toHaveProperty("max_tokens");
  });

  it("asks OpenRouter for plain JSON and puts the schema in the prompt instead", async () => {
    const { deps, calls } = setup({ env: { LLM_CHAIN: "openrouter:openrouter/free" }, steps: [{}] });
    await callChain(deps, REQUEST, parse);
    const body = calls[0]?.body as {
      response_format: unknown;
      messages: { role: string; content: string }[];
    };
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0]?.content).toContain("System text");
    expect(body.messages[0]?.content).toContain(JSON.stringify(REQUEST.jsonSchema));
    expect(body.messages[1]).toEqual(REQUEST.messages[1]);
  });
});

describe("falling back down the chain (L10)", () => {
  it("moves to the next model on a rate limit, and records both attempts", async () => {
    const { deps, calls, recorded } = setup({ steps: [{ status: 429 }, {}] });
    const result = await callChain(deps, REQUEST, parse);
    expect(result).toMatchObject({ ok: true, provider: "gemini", model: "gemini-3.6-flash" });
    expect(calls.map((c) => c.body["model"])).toEqual(["gemini-3.8-flash", "gemini-3.6-flash"]);
    expect(recorded.map((a) => [a.model, a.succeeded])).toEqual([
      ["gemini-3.8-flash", false],
      ["gemini-3.6-flash", true],
    ]);
  });

  it("reaches OpenRouter after Gemini and Groq both fail, a Groq timeout moves to gpt-oss-20b", async () => {
    const { deps, calls, recorded } = setup({
      env: { LLM_CHAIN: CHAIN },
      steps: [{ status: 429 }, { status: 429 }, { fail: "timeout" }, { status: 503 }, {}],
    });
    const result = await callChain(deps, REQUEST, parse);
    expect(result).toMatchObject({ ok: true, provider: "openrouter", model: "openrouter/free" });
    expect(calls.map((c) => c.body["model"])).toEqual([
      "gemini-3.8-flash",
      "gemini-3.6-flash",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "openrouter/free",
    ]);
    expect(recorded.map((a) => a.succeeded)).toEqual([false, false, false, false, true]);
  });

  it("treats a reply that does not parse, a cut-off reply, and a filtered reply as failures", async () => {
    for (const bad of [
      { content: "not json" },
      { content: '{"ok":"yes"}' },
      { finish: "length" },
      { finish: "content_filter" },
    ]) {
      const { deps, recorded } = setup({ env: { LLM_CHAIN: "groq:openai/gpt-oss-120b" }, steps: [bad] });
      expect(await callChain(deps, REQUEST, parse)).toEqual({ ok: false, reason: "unavailable" });
      expect(recorded).toEqual([
        {
          provider: "groq",
          model: "openai/gpt-oss-120b",
          inputTokens: 120,
          outputTokens: 30,
          succeeded: false,
        },
      ]);
    }
  });

  it("gives up with `unavailable` when every model fails, and every attempt has a record", async () => {
    const { deps, recorded } = setup({
      env: { LLM_CHAIN: CHAIN },
      steps: [{ status: 500 }, { status: 500 }, { status: 500 }, { status: 500 }, { status: 500 }],
    });
    expect(await callChain(deps, REQUEST, parse)).toEqual({ ok: false, reason: "unavailable" });
    expect(recorded).toHaveLength(5);
    expect(recorded.every((a) => !a.succeeded && a.inputTokens === 0)).toBe(true);
  });
});

describe("keys and budget", () => {
  it("skips a provider with no key without calling it or recording anything", async () => {
    const { deps, calls, recorded } = setup({
      env: { LLM_CHAIN: CHAIN, GEMINI_API_KEY: undefined, GROQ_API_KEY: undefined },
      steps: [{}],
    });
    const result = await callChain(deps, REQUEST, parse);
    expect(result).toMatchObject({ ok: true, provider: "openrouter" });
    expect(calls).toHaveLength(1);
    expect(recorded).toHaveLength(1);
  });

  it("is unavailable, with no call, when no provider has a key", async () => {
    const { deps, calls } = setup({
      env: { GEMINI_API_KEY: undefined, GROQ_API_KEY: undefined, OPENROUTER_API_KEY: undefined },
      steps: [{}],
    });
    expect(await callChain(deps, REQUEST, parse)).toEqual({ ok: false, reason: "unavailable" });
    expect(calls).toHaveLength(0);
  });

  it("does not call the model when the budget says no, and says why", async () => {
    for (const reason of ["disabled", "daily", "busy"] as const) {
      const { deps, calls, recorded } = setup({ steps: [{}], allow: () => reason });
      expect(await callChain(deps, REQUEST, parse)).toEqual({ ok: false, reason });
      expect(calls).toHaveLength(0);
      expect(recorded).toHaveLength(0);
    }
  });

  it("stops the chain in the middle when the budget runs out, because fallbacks count as attempts", async () => {
    let asked = 0;
    const { deps, calls } = setup({
      steps: [{ status: 429 }, {}],
      allow: () => (++asked === 1 ? "ok" : "daily"),
    });
    expect(await callChain(deps, REQUEST, parse)).toEqual({ ok: false, reason: "daily" });
    expect(calls).toHaveLength(1);
  });

  it("gives up on the whole chain when its total time is used up, even with models left", async () => {
    const { deps, calls } = setup({ steps: [{ status: 429 }, {}] });
    expect(await callChain({ ...deps, totalTimeoutMs: 0 }, REQUEST, parse)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(calls).toHaveLength(0);

    const slow = setup({ steps: [{ status: 429 }, {}] });
    const inner = slow.deps.fetch ?? fetch;
    slow.deps.fetch = async (...args: Parameters<typeof fetch>) => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      return inner(...args);
    };
    expect(await callChain({ ...slow.deps, totalTimeoutMs: 20 }, REQUEST, parse)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(slow.calls).toHaveLength(1);
  });

  it("still returns a good reply when recording the attempt fails", async () => {
    const { deps } = setup({ steps: [{}] });
    deps.record = () => Promise.reject(new Error("database down"));
    expect(await callChain(deps, REQUEST, parse)).toMatchObject({ ok: true });
  });
});

describe("secrets", () => {
  it("never writes a key or the prompt text to the logs", async () => {
    const { deps, logged } = setup({ steps: [{ status: 429 }, {}] });
    await callChain(deps, REQUEST, parse);
    const text = logged();
    expect(text).toContain("gemini-3.8-flash");
    for (const secret of ["gem-secret-key", "groq-secret-key", "or-secret-key", "User text", "System text"]) {
      expect(text).not.toContain(secret);
    }
  });
});
