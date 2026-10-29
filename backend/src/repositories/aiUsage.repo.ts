import type { Pool, PoolClient } from "pg";

type Db = Pick<Pool | PoolClient, "query">;

/** Real provider calls made on the current UTC day (cache hits do not count toward the cap). */
export async function countCallsToday(db: Db): Promise<number> {
  const result = await db.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM ai_usage WHERE day = (now() AT TIME ZONE 'UTC')::date AND cached = false",
  );
  return Number(result.rows[0]?.count ?? 0);
}
