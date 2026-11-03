import type { Pool, PoolClient } from "pg";
import { AppError } from "../http/errors";

/**
 * Runs `fn` in one transaction on its own connection. Commits when `fn` resolves and rolls back when it throws.
 * A connection that cannot even roll back is destroyed instead of returned to the pool.
 */
export async function withTransaction<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let broken = false;
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {
      broken = true;
    });
    throw err;
  } finally {
    client.release(broken);
  }
}

/**
 * Takes the contract's advisory lock for the whole of `fn`, so two requests can never run a capture or void wave
 * for the same contract at once. If another request holds it, throws 409 resolve_in_progress without waiting.
 *
 * The lock is session-level, so it lives on one dedicated connection for as long as `fn` runs. `fn` opens its own
 * transactions through `withTransaction`; this connection only carries the lock. The unlock runs on the same
 * connection in `finally`. If it cannot, the connection is destroyed, which also frees the lock.
 * Needs a direct (not pooled) Postgres connection, because transaction-mode poolers break session locks.
 */
export async function withContractLock<T>(pool: Pool, contractId: string, fn: () => Promise<T>): Promise<T> {
  // Each holder keeps a pool connection for a whole PayPal call. Capping them leaves the rest of the pool (quality.md:
  // 10) free for the transactions those holders need. A burst past the cap gets 409 at once, and callers retry.
  if (lockHolders >= MAX_LOCK_HOLDERS) {
    throw new AppError("resolve_in_progress", "Foldback is busy with other payments. Try again in a moment.");
  }
  lockHolders += 1;
  try {
    return await holdContractLock(pool, contractId, fn);
  } finally {
    lockHolders -= 1;
  }
}

/** At most this many requests hold a contract lock at once, in this process. */
const MAX_LOCK_HOLDERS = 5;
let lockHolders = 0;

async function holdContractLock<T>(pool: Pool, contractId: string, fn: () => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let acquired = false;
  try {
    const result = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock(hashtextextended($1::text, 0)) AS locked",
      [contractId],
    );
    acquired = result.rows[0]?.locked === true;
  } catch (err) {
    client.release(true);
    throw err;
  }
  if (!acquired) {
    client.release();
    throw new AppError(
      "resolve_in_progress",
      "Another request is already working on this plan. Try again in a moment.",
    );
  }

  let broken = false;
  try {
    return await fn();
  } finally {
    await client
      .query<{ unlocked: boolean }>("SELECT pg_advisory_unlock(hashtextextended($1::text, 0)) AS unlocked", [
        contractId,
      ])
      .then((r) => {
        if (r.rows[0]?.unlocked !== true) broken = true;
      })
      .catch(() => {
        broken = true;
      });
    client.release(broken);
  }
}
