import type { PoolClient } from "pg";

/**
 * Locks the contract row until the transaction ends. Every money transaction starts with this, so the contract
 * cannot change underneath it. Returns false when the contract does not exist.
 */
export async function lockContractRow(client: PoolClient, contractId: string): Promise<boolean> {
  const result = await client.query("SELECT 1 FROM contracts WHERE id = $1 FOR UPDATE", [contractId]);
  return result.rowCount === 1;
}
