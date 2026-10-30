import type { Pool } from "pg";
import type { Env } from "../config/env";
import { migrationsCurrent } from "../db/migrator";
import { hasUsableModel } from "../integrations/llm/client";
import { AppError } from "../http/errors";
import type { HealthSummary } from "../shared/api-types";
import { countCallsToday } from "../repositories/aiUsage.repo";

export type Readiness = "ok" | "unavailable" | "migrations_pending";

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
  return {
    ok: true,
    service: "foldback",
    version: env.GIT_SHA,
    paypal_env: env.PAYPAL_ENV,
    llm: env.AI_ENABLED && hasUsableModel(env),
    ai_calls_left: Math.max(0, env.AI_DAILY_CALLS - used),
  };
}
