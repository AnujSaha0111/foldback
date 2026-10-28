// Phase 0 spike: prove free LLMs can do strict structured output and tool calling.
// Usage: yarn spike:llm
// Reads keys from spike/api/.env. Any provider whose key is missing is skipped.
//   GEMINI_API_KEY      free key from aistudio.google.com/apikey
//   GROQ_API_KEY        free key from console.groq.com/keys
//   OPENROUTER_API_KEY  optional, free key from openrouter.ai/keys
import "dotenv/config";
import { z } from "zod";

const PROVIDERS = {
  gemini: {
    base: "https://generativelanguage.googleapis.com/v1beta/openai",
    key: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL, // chosen from the model list below when unset
    extra: { reasoning_effort: "low", max_tokens: 4000 },
  },
  groq: {
    base: "https://api.groq.com/openai/v1",
    key: process.env.GROQ_API_KEY,
    model: process.env.LLM_PRIMARY_MODEL ?? "openai/gpt-oss-120b",
    extra: { reasoning_effort: "low", max_completion_tokens: 2000 },
  },
} as const;

interface ApiResult {
  status: number;
  body: Record<string, unknown>;
  headers: Headers;
  ms: number;
}

async function call(
  base: string,
  key: string | undefined,
  path: string,
  body?: unknown,
  timeoutMs = 45_000,
): Promise<ApiResult> {
  const t0 = Date.now();
  let res: Response;
  let text: string;
  try {
    res = await fetch(`${base}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    text = await res.text();
  } catch (error) {
    // Timeouts and network errors are reported, not thrown, so the rest of the spike still runs.
    return { status: 0, body: { error: String(error) }, headers: new Headers(), ms: Date.now() - t0 };
  }
  let parsed: Record<string, unknown>;
  try {
    const json: unknown = text ? JSON.parse(text) : {};
    parsed = Array.isArray(json) ? { list: json } : (json as Record<string, unknown>);
  } catch {
    parsed = { raw: text.slice(0, 300) };
  }
  return { status: res.status, body: parsed, headers: res.headers, ms: Date.now() - t0 };
}

function printRateLimits(headers: Headers): void {
  const lines: string[] = [];
  headers.forEach((value, name) => {
    if (name.startsWith("x-ratelimit") || name === "retry-after") lines.push(`${name}=${value}`);
  });
  console.log("  rate limits:", lines.length ? lines.join("  ") : "(none reported by this provider)");
}

interface ChatMessage {
  role: string;
  content?: string | null;
  tool_call_id?: string;
  tool_calls?: { id: string; function: { name: string; arguments: string } }[];
}
interface ChatBody {
  choices?: { finish_reason: string; message: ChatMessage }[];
  usage?: unknown;
}

// The cabin chat from docs/spec/demo.md, copied exactly.
const CABIN_CHAT = `[Sun 1 Nov, 11:42] Alex Chen: ok the cabin is $320 for the weekend, owner wants the money by friday
[Sun 1 Nov, 11:43] Sam Ortiz: so $80 each if it's the four of us
[Sun 1 Nov, 11:43] Jordan Lee: I'm in
[Sun 1 Nov, 11:45] Maya Shah: I'm in but I don't get paid until monday
[Sun 1 Nov, 11:46] Alex Chen: Maya you can have until monday 6pm. everyone else by friday 6pm pacific. if we don't have all 4 the trip is off and nobody pays
[Sun 1 Nov, 11:47] Sam Ortiz: works for me`;

const Spike = z.object({
  title: z.string().nullable(),
  share_cents: z.number().int().nullable(),
  headcount: z.number().int().nullable(),
  people: z.array(z.string()),
  evidence: z.array(z.object({ field: z.string(), quote: z.string() })),
});
const { $schema: _a, ...spikeSchema } = z.toJSONSchema(Spike) as Record<string, unknown>;
const LookupArgs = z.object({ name: z.string() });
const { $schema: _b, ...lookupSchema } = z.toJSONSchema(LookupArgs) as Record<string, unknown>;

async function checkProvider(label: string, base: string, key: string, model: string, extra: object): Promise<void> {
  console.log(`\n== ${label}: ping (plain request, no schema, no tools) ==`);
  const ping = await call(base, key, "/chat/completions", {
    model,
    temperature: 0,
    ...extra,
    messages: [{ role: "user", content: "Reply with the single word: ok" }],
  }, 20_000);
  console.log("  HTTP", ping.status, `${ping.ms} ms`, ping.status === 200 ? "" : JSON.stringify(ping.body).slice(0, 500));
  printRateLimits(ping.headers);
  if (ping.status !== 200) {
    console.log("  Ping failed, so the schema and tool checks would fail too. Skipping them.");
    return;
  }

  console.log(`\n== ${label}: strict JSON-schema output ==`);
  const structured = await call(base, key, "/chat/completions", {
    model,
    temperature: 0,
    ...extra,
    messages: [
      {
        role: "system",
        content:
          "You read group payment plans. Fill the schema only with what the text states. title is a short name for what the group pays for (three words or fewer). share_cents is integer cents. Evidence quotes must be exact substrings of the text.",
      },
      {
        role: "user",
        content: `Reference time: Sunday 1 November 2026, 12:00 PM PST.\n\n<group_text>\n${CABIN_CHAT}\n</group_text>`,
      },
    ],
    response_format: { type: "json_schema", json_schema: { name: "plan", strict: true, schema: spikeSchema } },
  });
  console.log("  HTTP", structured.status, `${structured.ms} ms`);
  printRateLimits(structured.headers);
  const sb = structured.body as ChatBody;
  if (structured.status >= 400 || structured.status === 0) {
    console.log("  ERROR BODY:", JSON.stringify(structured.body).slice(0, 700));
  } else {
    const choice = sb.choices?.[0];
    console.log("  finish_reason:", choice?.finish_reason, " usage:", JSON.stringify(sb.usage));
    try {
      const check = Spike.safeParse(JSON.parse(choice?.message.content ?? "{}"));
      console.log("  zod valid:", check.success);
      console.log(check.success ? JSON.stringify(check.data) : JSON.stringify(check.error.issues));
    } catch {
      console.log("  reply was not JSON:", String(choice?.message.content).slice(0, 300));
    }
  }

  console.log(`\n== ${label}: tool calling ==`);
  const messages: ChatMessage[] = [
    { role: "system", content: "Use tools for facts. Answer in one short sentence." },
    { role: "user", content: "Has Maya Shah paid yet?" },
  ];
  for (let i = 1; i <= 4; i += 1) {
    const r = await call(base, key, "/chat/completions", {
      model,
      temperature: 0,
      ...extra,
      messages,
      tool_choice: "auto",
      tools: [
        {
          type: "function",
          function: { name: "lookup_person", description: "Look up whether a person has paid.", parameters: lookupSchema },
        },
      ],
    });
    console.log(`  turn ${i}: HTTP ${r.status}, ${r.ms} ms`);
    if (r.status >= 400 || r.status === 0) {
      console.log("  ERROR BODY:", JSON.stringify(r.body).slice(0, 700));
      return;
    }
    const msg = (r.body as ChatBody).choices?.[0]?.message;
    if (!msg) return;
    messages.push(msg);
    if (msg.tool_calls?.length) {
      for (const tc of msg.tool_calls) {
        const args = LookupArgs.parse(JSON.parse(tc.function.arguments));
        console.log(`  tool call: ${tc.function.name}(${JSON.stringify(args)})`);
        messages.push({ role: "tool", content: `${args.name} has NOT paid yet.`, tool_call_id: tc.id });
      }
      continue;
    }
    console.log("  final answer:", msg.content);
    return;
  }
}

// ---- Gemini ----
if (PROVIDERS.gemini.key) {
  console.log("== Gemini models visible to this key ==");
  const list = await call(PROVIDERS.gemini.base, PROVIDERS.gemini.key, "/models");
  const ids = ((list.body["data"] as { id: string }[] | undefined) ?? []).map((m) => m.id.replace(/^models\//, ""));
  console.log("  HTTP", list.status, "models:", ids.length);
  console.log("  gemini ids:", ids.filter((id) => /^gemini/.test(id) && !/embed|image|tts|live|audio/.test(id)).join(", "));
  // Older models (for example gemini-2.5-flash) return 404 "no longer available to new users".
  const wanted = PROVIDERS.gemini.model ? [PROVIDERS.gemini.model] : ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
  for (const model of wanted) {
    await checkProvider(`Gemini ${model}`, PROVIDERS.gemini.base, PROVIDERS.gemini.key, model, PROVIDERS.gemini.extra);
  }
} else {
  console.log("(no GEMINI_API_KEY set, skipping Gemini)");
}

// ---- Groq ----
if (PROVIDERS.groq.key) {
  console.log("\n== Groq models ==");
  const models = await call(PROVIDERS.groq.base, PROVIDERS.groq.key, "/models");
  const ids = ((models.body["data"] as { id: string }[] | undefined) ?? []).map((m) => m.id);
  console.log("  HTTP", models.status, "total models:", ids.length, " ids:", ids.join(", "));
  await checkProvider("Groq", PROVIDERS.groq.base, PROVIDERS.groq.key, PROVIDERS.groq.model, PROVIDERS.groq.extra);
} else {
  console.log("(no GROQ_API_KEY set, skipping Groq)");
}

// ---- OpenRouter free models with tools + structured outputs ----
console.log("\n== OpenRouter free models (tools + structured_outputs) ==");
interface OrModel {
  id: string;
  context_length: number;
  pricing: { prompt: string; completion: string };
  supported_parameters?: string[];
}
const or = await call("https://openrouter.ai/api/v1", undefined, "/models");
const free = ((or.body["data"] as OrModel[] | undefined) ?? [])
  .filter(
    (m) =>
      m.pricing.prompt === "0" &&
      m.pricing.completion === "0" &&
      (m.supported_parameters ?? []).includes("tools") &&
      (m.supported_parameters ?? []).includes("structured_outputs"),
  )
  .sort((a, b) => b.context_length - a.context_length);
console.log("  HTTP", or.status, "free models with both features:", free.length);
for (const m of free.slice(0, 6)) console.log(`   - ${m.id}  (context ${m.context_length})`);
const orKey = process.env.OPENROUTER_API_KEY?.trim();
const orTop = free.find((m) => m.id === "openrouter/free") ?? free[0];
if (orTop && orKey) {
  const r = await call("https://openrouter.ai/api/v1", orKey, "/chat/completions", {
    model: orTop.id,
    temperature: 0,
    max_tokens: 300,
    messages: [{ role: "user", content: 'Reply with JSON: {"ok": true}' }],
    response_format: { type: "json_object" },
  });
  console.log(`  test call to ${orTop.id}: HTTP ${r.status}, ${r.ms} ms`);
  if (r.status >= 400) console.log("  ERROR BODY:", JSON.stringify(r.body).slice(0, 400));
} else {
  console.log("  (no OPENROUTER_API_KEY set, skipping the test call)");
}

console.log("\nDone. Paste this whole output into the chat. It contains no keys.");
