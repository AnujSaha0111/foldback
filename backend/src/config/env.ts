import { z } from "zod";

// The order is measured, not guessed (docs/spec/ai.md, "Bake-off results"). Models that scored badly or could not be
// scored are left out, because every failed attempt in a chain still costs time and counts toward the daily cap.
const DEFAULT_LLM_CHAIN =
  "deepseek:deepseek-flash,groq:openai/gpt-oss-120b,gemini:gemini-3.1-flash-lite,gemini:gemini-3.5-flash-lite";

const PROVIDERS = new Set(["gemini", "groq", "openrouter", "deepseek"]);

/** The rule that keeps the project free: an OpenRouter entry must be a free model. */
function chainProblem(chain: string): string | null {
  for (const entry of chain.split(",").map((e) => e.trim())) {
    const at = entry.indexOf(":");
    const provider = at === -1 ? "" : entry.slice(0, at);
    const model = at === -1 ? "" : entry.slice(at + 1);
    if (!PROVIDERS.has(provider) || model === "")
      return `"${entry}" is not provider:model with a known provider`;
    if (provider === "openrouter" && model !== "openrouter/free" && !model.endsWith(":free")) {
      return `"${entry}" is not a free OpenRouter model`;
    }
  }
  return null;
}

const flag = z
  .enum(["true", "false"])
  .transform((v) => v === "true")
  .default(true);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  DATABASE_URL: z.string().min(1),
  MIGRATE_DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32, "must be at least 32 characters"),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((v) => v.split(",").map((o) => o.trim()))
    .pipe(z.array(z.url()).min(1))
    // Keep only the origin, so "https://app.example.com/" matches what the browser sends and what cors compares.
    .transform((list) => list.map((o) => new URL(o).origin)),
  APP_BASE_URL: z.url(),
  /** Parent domain for the session cookie in production, for example `.example.com`, so app. and api. share it. */
  COOKIE_DOMAIN: z
    .string()
    .regex(/^\.?[a-z0-9-]+(\.[a-z0-9-]+)+$/i, "must be a domain such as .example.com")
    .optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  METRICS_TOKEN: z.string().min(16).optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  SIGNUPS_ENABLED: flag,
  GIT_SHA: z.string().min(1).default("dev"),
  PAYPAL_ENV: z.literal("sandbox", "must be exactly sandbox. Foldback never runs against live PayPal"),
  PAYPAL_API_BASE: z
    .literal(
      "https://api-m.sandbox.paypal.com",
      "must be the sandbox API. Foldback never runs against live PayPal",
    )
    .default("https://api-m.sandbox.paypal.com"),
  /** Optional at boot, so a deploy without them still serves the app. Without them no PayPal call is made. */
  PAYPAL_CLIENT_ID: z.string().min(1).optional(),
  PAYPAL_CLIENT_SECRET: z.string().min(1).optional(),
  /** Kill switch for checkout and authorize. */
  PAYPAL_WRITES_ENABLED: flag,
  PAYPAL_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  AI_ENABLED: flag,
  AI_DAILY_CALLS: z.coerce.number().int().positive().default(600),
  /** AI attempts per minute across everyone, kept under the smallest free provider limit (docs/spec/ai.md). */
  AI_GLOBAL_PER_MIN: z.coerce.number().int().positive().default(12),
  AI_USER_PER_MIN: z.coerce.number().int().positive().default(6),
  AI_USER_PER_DAY: z.coerce.number().int().positive().default(30),
  AI_IP_PER_MIN: z.coerce.number().int().positive().default(10),
  AI_IP_PER_DAY: z.coerce.number().int().positive().default(60),
  /** Keys the hash of a visitor's IP in ai_usage. Falls back to JWT_SECRET, so no new secret is needed. */
  IP_HASH_SALT: z.string().min(16).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GROQ_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  /** DeepSeek is prepaid, not free. The balance on the account is the cap. Leave unset to keep the chain free. */
  DEEPSEEK_API_KEY: z.string().min(1).optional(),
  LLM_CHAIN: z
    .string()
    .default(DEFAULT_LLM_CHAIN)
    .superRefine((chain, ctx) => {
      const problem = chainProblem(chain);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
});

export type Env = z.infer<typeof schema>;

export class EnvError extends Error {
  constructor(
    readonly variables: string[],
    message: string,
  ) {
    super(message);
    this.name = "EnvError";
  }
}

/** Parses an environment, treating empty strings as unset. Throws an EnvError that names every bad variable. */
export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== "") cleaned[key] = value;
  }
  const result = schema.safeParse(cleaned);
  if (result.success) return result.data;
  const names = [...new Set(result.error.issues.map((i) => String(i.path[0] ?? "env")))];
  const lines = result.error.issues.map((i) => `${String(i.path[0] ?? "env")}: ${i.message}`);
  throw new EnvError(names, `Invalid environment. ${lines.join("; ")}`);
}

let cached: Env | undefined;

/** The process environment, parsed once. Boot calls this first so a bad value stops the server early. */
export function loadEnv(): Env {
  cached ??= parseEnv();
  return cached;
}
