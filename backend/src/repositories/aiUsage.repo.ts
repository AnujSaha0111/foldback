import type { Pool, PoolClient } from "pg";

type Db = Pick<Pool | PoolClient, "query">;

/** Real provider calls made on the current UTC day (cache hits do not count toward the cap). */
export async function countCallsToday(db: Db): Promise<number> {
  const result = await db.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM ai_usage WHERE day = (now() AT TIME ZONE 'UTC')::date AND cached = false",
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
