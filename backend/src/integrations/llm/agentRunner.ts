import { z } from "zod";
import { callChain } from "./client";
import type { ChatMessage, LlmDeps, LlmResult } from "./client";

// The organizer agent's manual tool loop (docs/spec/ai.md, Job 2). Each step is one JSON reply through the normal
// model chain: either a tool to call, or the answer. JSON replies work the same on every provider in the chain, so no
// provider-specific tool-calling format is needed, and every step is one counted attempt like any other.

/** At most this many steps, tool calls and the answer together. */
const MAX_STEPS = 6;
const MAX_REPLY_TOKENS = 1500;

export type ToolOutcome = { ok: true; result: unknown; summary: string } | { ok: false; error: string };

export interface AgentTool {
  name: string;
  description: string;
  input: z.ZodType;
  run(input: unknown): Promise<ToolOutcome>;
}

export interface AgentAnswer {
  reply: string;
  toolCalls: { name: string; summary: string }[];
}

const StepSchema = z.strictObject({
  action: z.enum(["tool", "reply"]),
  tool: z.string(),
  input_json: z.string(),
  reply: z.string(),
});
type Step = z.infer<typeof StepSchema>;

function stepJsonSchema(tools: AgentTool[]): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      action: { type: "string", enum: ["tool", "reply"] },
      tool: { type: "string", enum: [...tools.map((tool) => tool.name), ""] },
      input_json: { type: "string" },
      reply: { type: "string" },
    },
    required: ["action", "tool", "input_json", "reply"],
    additionalProperties: false,
  };
}

/** How to reply, and what each tool takes. Appended to the system prompt. */
function protocol(tools: AgentTool[]): string {
  const list = tools
    .map((tool) => `- ${tool.name}: ${tool.description} Input: ${JSON.stringify(z.toJSONSchema(tool.input))}`)
    .join("\n");
  return [
    "Answer with one JSON object per turn.",
    'To call a tool: {"action":"tool","tool":"<name>","input_json":"<the input as a JSON string>","reply":""}.',
    'To answer the organizer: {"action":"reply","tool":"","input_json":"","reply":"<your answer>"}.',
    "After a tool call you get its result, then you decide the next step. Tools:",
    list,
  ].join("\n");
}

function parseStep(content: string): Step | null {
  try {
    const parsed = StepSchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Runs one tool. Bad input and unknown tools come back to the model as an error result, never as a guess. */
async function runTool(tools: AgentTool[], step: Step): Promise<ToolOutcome> {
  const tool = tools.find((candidate) => candidate.name === step.tool);
  if (!tool) return { ok: false, error: `There is no tool named "${step.tool}".` };
  let raw: unknown;
  try {
    raw = JSON.parse(step.input_json || "{}");
  } catch {
    return { ok: false, error: "input_json is not valid JSON." };
  }
  const input = tool.input.safeParse(raw);
  if (!input.success) return { ok: false, error: `Invalid input: ${input.error.message}` };
  return tool.run(input.data);
}

/**
 * Lets the model call tools until it answers, at most MAX_STEPS times. The tools only read, simulate, or record a
 * proposal or a draft for the organizer to act on, so nothing the model does here can move money.
 */
export async function runAgent(
  deps: LlmDeps,
  system: string,
  conversation: ChatMessage[],
  tools: AgentTool[],
): Promise<LlmResult<AgentAnswer>> {
  const messages: ChatMessage[] = [
    { role: "system", content: `${system}\n\n${protocol(tools)}` },
    ...conversation,
  ];
  const toolCalls: AgentAnswer["toolCalls"] = [];
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const result = await callChain(
      deps,
      { messages, schemaName: "agent_step", jsonSchema: stepJsonSchema(tools), maxTokens: MAX_REPLY_TOKENS },
      parseStep,
    );
    if (!result.ok) return result;
    const { value, provider, model } = result;
    if (value.action === "reply")
      return { ok: true, value: { reply: value.reply, toolCalls }, provider, model };

    const outcome = await runTool(tools, value);
    if (outcome.ok) toolCalls.push({ name: value.tool, summary: outcome.summary });
    messages.push(
      { role: "assistant", content: JSON.stringify(value) },
      {
        role: "user",
        content: `Result of ${value.tool}: ${JSON.stringify(outcome.ok ? outcome.result : outcome)}`,
      },
    );
  }
  return { ok: false, reason: "unavailable" };
}
