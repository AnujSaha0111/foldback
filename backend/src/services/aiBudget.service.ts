import { createHmac } from "node:crypto";
import type { Pool } from "pg";
import type { Env } from "../config/env";
import { countAttemptsSince, countCallsToday, insertAttempt } from "../repositories/aiUsage.repo";

/** Whether another provider attempt may be made right now. Anything but "ok" means do not call the model. */
export type Allowance = "ok" | "disabled" | "daily" | "busy";

export interface UsageContext {
  route: "extract" | "agent";
  userId: string | null;
  contractId: string | null;
  ipHash: string;
}

export interface UsedAttempt {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  succeeded: boolean;
}

export interface AiBudget {
  /** `slots`: attempts the caller is about to spend, so a multi-step turn does not stop halfway. */
  allow(slots?: number): Promise<Allowance>;
  record(context: UsageContext, attempt: UsedAttempt): Promise<void>;
  /** A cache hit: shown in the table under the model that would have answered, but it counts toward no cap. */
  recordCacheHit(context: UsageContext, served: { provider: string; model: string }): Promise<void>;
}

/** The free quota is shared by every visitor, so the caps protect the live demo (docs/spec/ai.md, cost and abuse). */
export function createAiBudget(env: Env, pool: Pool): AiBudget {
  return {
    async allow(slots = 1) {
      if (!env.AI_ENABLED) return "disabled";
      if ((await countCallsToday(pool)) >= env.AI_DAILY_CALLS) return "daily";
      if ((await countAttemptsSince(pool, 60)) + slots > env.AI_GLOBAL_PER_MIN) return "busy";
      return "ok";
    },
    async record(context, attempt) {
      await insertAttempt(pool, { ...context, ...attempt, cached: false });
    },
    async recordCacheHit(context, served) {
      await insertAttempt(pool, {
        ...context,
        ...served,
        inputTokens: 0,
        outputTokens: 0,
        succeeded: true,
        cached: true,
      });
    },
  };
}

/** An IP address never reaches the database. Only this keyed hash does, so repeat visitors can be counted. */
export function hashIp(env: Env, ip: string): string {
  return createHmac("sha256", env.IP_HASH_SALT ?? `ip-hash|${env.JWT_SECRET}`)
    .update(ip)
    .digest("hex");
}
