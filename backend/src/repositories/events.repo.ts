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

export interface NewEvent {
  contractId: string;
  type: string;
  detail: string;
  shareId?: string;
}

/** Appends one line to a contract's history. `detail` is at most 500 characters (the table refuses more). */
export async function insertEvent(db: Db, event: NewEvent): Promise<void> {
  await db.query(
    "INSERT INTO events (contract_id, share_id, type, detail, occurred_at) VALUES ($1, $2, $3, $4, now())",
    [event.contractId, event.shareId ?? null, event.type, event.detail],
  );
}

/** Whether this kind of event ever happened on the plan. */
export async function hasEvent(db: Db, contractId: string, type: string): Promise<boolean> {
  const result = await db.query("SELECT 1 FROM events WHERE contract_id = $1 AND type = $2 LIMIT 1", [
    contractId,
    type,
  ]);
  return result.rowCount === 1;
}
