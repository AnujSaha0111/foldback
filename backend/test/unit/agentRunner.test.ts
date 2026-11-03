import { PassThrough } from "node:stream";
import { z } from "zod";
import { runAgent } from "../../src/integrations/llm/agentRunner";
import type { AgentTool } from "../../src/integrations/llm/agentRunner";
import type { UsedAttempt } from "../../src/services/aiBudget.service";
import { createLogger } from "../../src/observability/logger";
import { scripted } from "../helpers/llmStub";
import { testEnv } from "../helpers/env";

const step = (value: object) => ({ content: JSON.stringify(value) });
const callTool = (tool: string, input: object) =>
  step({ action: "tool", tool, input_json: JSON.stringify(input), reply: "" });
const answer = (reply: string) => step({ action: "reply", tool: "", input_json: "", reply });

function setup(steps: ReturnType<typeof step>[]) {
  const { fetch, calls } = scripted(steps);
  const recorded: UsedAttempt[] = [];
  const deps = {
    env: testEnv({ GROQ_API_KEY: "groq-test-key", LLM_CHAIN: "groq:openai/gpt-oss-120b" }),
    logger: createLogger({ level: "error", json: true, stream: new PassThrough() }),
    allow: () => Promise.resolve("ok" as const),
    record: (attempt: UsedAttempt) => {
      recorded.push(attempt);
      return Promise.resolve();
    },
    fetch,
  };
  const runs: unknown[] = [];
  const echo: AgentTool = {
    name: "echo",
    description: "Says it back.",
    input: z.strictObject({ text: z.string() }),
    run: (input) => {
      runs.push(input);
      return Promise.resolve({ ok: true, result: { said: input }, summary: "Echoed" });
    },
  };
  return { deps, calls, recorded, runs, tools: [echo] };
}

describe("runAgent", () => {
  it("calls a tool, feeds back its result, then answers, with one recorded attempt per step", async () => {
    const { deps, calls, recorded, runs, tools } = setup([callTool("echo", { text: "hi" }), answer("Done.")]);
    const result = await runAgent(deps, "You help.", [{ role: "user", content: "Echo hi" }], tools);

    expect(result).toMatchObject({
      ok: true,
      value: { reply: "Done.", toolCalls: [{ name: "echo", summary: "Echoed" }] },
    });
    expect(runs).toEqual([{ text: "hi" }]);
    expect(recorded).toHaveLength(2);
    const second = JSON.stringify(calls[1]?.body);
    expect(second).toContain("Result of echo");
    expect(second).toContain('\\"said\\"');
  });

  it("tells the model about a bad tool or bad input instead of running anything", async () => {
    const { deps, calls, runs, tools } = setup([
      callTool("delete_everything", {}),
      callTool("echo", { text: 5 }),
      answer("Sorry."),
    ]);
    await runAgent(deps, "You help.", [{ role: "user", content: "x" }], tools);
    expect(runs).toEqual([]);
    expect(JSON.stringify(calls[1]?.body)).toContain("There is no tool named");
    expect(JSON.stringify(calls[2]?.body)).toContain("Invalid input");
  });

  it("gives up after six steps without an answer", async () => {
    const loop = Array.from({ length: 7 }, () => callTool("echo", { text: "again" }));
    const { deps, runs, tools } = setup(loop);
    expect(await runAgent(deps, "You help.", [{ role: "user", content: "x" }], tools)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(runs).toHaveLength(6);
  });

  it("never forces a tool choice", async () => {
    const { deps, calls, tools } = setup([answer("Hi.")]);
    await runAgent(deps, "You help.", [{ role: "user", content: "x" }], tools);
    expect(calls[0]?.body).not.toHaveProperty("tool_choice");
  });
});
