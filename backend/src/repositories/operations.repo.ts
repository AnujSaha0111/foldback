import type { Pool, PoolClient } from "pg";
import { newId } from "../db/ids";

type Db = Pick<Pool | PoolClient, "query">;

type WriteKind = "create_order" | "authorize";
type ReadKind = "get_order" | "get_authorization";

export interface OperationRequest {
  method: string;
  path: string;
  key: string | null;
  body: unknown;
}

/** What came back from PayPal. `outcome` is never `pending` here: a row only leaves `pending` this way. */
export interface OperationResult {
  outcome: "completed" | "failed" | "unknown";
  status: number | null;
  debugId: string | null;
  response: unknown;
}

function storedRequest(request: OperationRequest): string {
  return JSON.stringify({ method: request.method, path: request.path, body: request.body });
}

/**
 * Records a call about to be made, before it is made. The unique indexes make this the guard: a second call in flight
 * for the share, or a live key used again, fails here with 23505 and never reaches PayPal.
 */
export async function insertPending(
  db: Db,
  input: { shareId: string; kind: WriteKind; request: OperationRequest },
): Promise<string> {
  const id = newId("op");
  await db.query(
    `INSERT INTO paypal_operations (id, share_id, kind, idempotency_key, request, outcome)
     VALUES ($1, $2, $3, $4, $5, 'pending')`,
    [id, input.shareId, input.kind, input.request.key, storedRequest(input.request)],
  );
  return id;
}

/**
 * Writes the result onto its row. The database refuses this once the row has settled, and a missing row throws: left
 * unnoticed, the real row would stay `pending` and block every later checkout for the share.
 */
export async function settle(db: Db, id: string, result: OperationResult): Promise<void> {
  const updated = await db.query(
    `UPDATE paypal_operations
        SET outcome = $2, response_status = $3, response = $4, paypal_debug_id = $5
      WHERE id = $1`,
    [id, result.outcome, result.status, JSON.stringify(result.response), result.debugId],
  );
  if (updated.rowCount !== 1) throw new Error(`No PayPal operation ${id} to settle`);
}

/** Reads have no pending stage and no key: they cannot change anything at PayPal, so each is logged after it ran. */
export async function recordRead(
  db: Db,
  input: { shareId: string; kind: ReadKind; request: OperationRequest; result: OperationResult },
): Promise<void> {
  const { result } = input;
  await db.query(
    `INSERT INTO paypal_operations
       (id, share_id, kind, request, outcome, response_status, response, paypal_debug_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      newId("op"),
      input.shareId,
      input.kind,
      storedRequest(input.request),
      result.outcome,
      result.status,
      JSON.stringify(result.response),
      result.debugId,
    ],
  );
}
