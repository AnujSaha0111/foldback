import type { Pool, PoolClient } from "pg";

type Db = Pick<Pool | PoolClient, "query">;

/** Real provider calls made on the current UTC day (cache hits do not count toward the cap). */
export async function countCallsToday(db: Db): Promise<number> {
  const result = await db.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM ai_usage WHERE day = (now() AT TIME ZONE 'UTC')::date AND cached = false",
  );
  return Number(result.rows[0]?.count ?? 0);
}

export interface AiAttempt {
  route: "extract" | "agent";
  provider: string;
  model: string;
  userId: string | null;
  contractId: string | null;
  ipHash: string;
  inputTokens: number;
  outputTokens: number;
  succeeded: boolean;
  cached: boolean;
}

/** One row per provider attempt (fallbacks included) and per cache hit. `day` is set by the database. */
export async function insertAttempt(db: Db, row: AiAttempt): Promise<void> {
  await db.query(
    `INSERT INTO ai_usage (route, provider, model, user_id, contract_id, ip_hash, input_tokens, output_tokens,
                           succeeded, cached)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      row.route,
      row.provider,
      row.model,
      row.userId,
      row.contractId,
      row.ipHash,
      row.inputTokens,
      row.outputTokens,
      row.succeeded,
      row.cached,
    ],
  );
}

/** Real provider attempts in the last `seconds` seconds, by anyone. */
export async function countAttemptsSince(db: Db, seconds: number): Promise<number> {
  const result = await db.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM ai_usage WHERE created_at > now() - make_interval(secs => $1) AND cached = false",
    [seconds],
  );
  return Number(result.rows[0]?.count ?? 0);
}

/** Housekeeping, run as the table owner (the app role has no DELETE on this table). Returns the rows removed. */
export async function deleteOlderThanDays(db: Db, days: number): Promise<number> {
  const result = await db.query("DELETE FROM ai_usage WHERE created_at < now() - make_interval(days => $1)", [
    days,
  ]);
  return result.rowCount ?? 0;
}
