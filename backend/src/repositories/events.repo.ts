import type { Pool, PoolClient } from "pg";

type Db = Pick<Pool | PoolClient, "query">;

export interface EventRow {
  type: string;
  detail: string;
  createdAt: Date;
  shareId: string | null;
}

interface RawEventRow {
  type: string;
  detail: string;
  created_at: Date;
  share_id: string | null;
}

/** The newest events of a contract, newest first. (The event id is a bigint, which pg returns as a string, so it is not selected.) */
export async function listRecent(db: Db, contractId: string, limit: number): Promise<EventRow[]> {
  const result = await db.query<RawEventRow>(
    "SELECT type, detail, created_at, share_id FROM events WHERE contract_id = $1 ORDER BY id DESC LIMIT $2",
    [contractId, limit],
  );
  return result.rows.map((r) => ({
    type: r.type,
    detail: r.detail,
    createdAt: r.created_at,
    shareId: r.share_id,
  }));
}
