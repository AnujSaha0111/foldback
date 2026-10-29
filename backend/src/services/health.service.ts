import type { Pool } from "pg";
import type { Env } from "../config/env";
import { migrationsCurrent } from "../db/migrator";
import { AppError } from "../http/errors";
import { countCallsToday } from "../repositories/aiUsage.repo";

export type Readiness = "ok" | "unavailable" | "migrations_pending";

export interface HealthSummary {
  ok: true;
  service: "foldback";
  version: string;
  paypal_env: "sandbox";
  llm: boolean;
  ai_calls_left: number;
}

/** Ready only when Postgres answers and every migration is applied. Never throws. */
export async function readiness(pool: Pool): Promise<Readiness> {
  try {
    await pool.query("SELECT 1");
    return (await migrationsCurrent(pool)) ? "ok" : "migrations_pending";
  } catch {
    return "unavailable";
  }
}

export async function healthSummary(env: Env, pool: Pool): Promise<HealthSummary> {
  let used: number;
  try {
    used = await countCallsToday(pool);
  } catch {
    throw new AppError("unavailable", "The database is not reachable right now.");
  }
  const hasKey = Boolean(env.GEMINI_API_KEY ?? env.GROQ_API_KEY ?? env.OPENROUTER_API_KEY);
  return {
    ok: true,
    service: "foldback",
    version: env.GIT_SHA,
    paypal_env: env.PAYPAL_ENV,
    llm: env.AI_ENABLED && hasKey,
    ai_calls_left: Math.max(0, env.AI_DAILY_CALLS - used),
  };
}
