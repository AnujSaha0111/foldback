import type { Pool, PoolClient } from "pg";
import { newId } from "../db/ids";

type Db = Pick<Pool | PoolClient, "query">;

/**
 * Locks the contract row until the transaction ends. Every money transaction starts with this, so the contract
 * cannot change underneath it. Returns false when the contract does not exist.
 */
export async function lockContractRow(client: PoolClient, contractId: string): Promise<boolean> {
  const result = await client.query("SELECT 1 FROM contracts WHERE id = $1 FOR UPDATE", [contractId]);
  return result.rowCount === 1;
}

export interface SeedContractInput {
  ownerId: string;
  seedKey: "cabin-hold" | "print-full";
  title: string;
  ruleText: string;
  ruleHash: string;
  referenceAt: string;
  confirmedAt: string;
  totalCents: number;
  shareCents: number;
  headcount: number;
  deadlineAt: string;
  timezone: string;
  graceName: string | null;
  graceUntil: string | null;
  demoNow: string;
}

/** Inserts a sample contract already in its final starting status (`active`). Returns its id. */
export async function insertSeedContract(db: Db, input: SeedContractInput): Promise<string> {
  const id = newId("con");
  await db.query(
    `INSERT INTO contracts (id, owner_id, seed_key, title, rule_text, rule_hash, reference_at, status,
       money_source, currency, total_cents, share_cents, headcount, deadline_at, timezone,
       grace_person_name, grace_until, demo_now, confirmed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', 'sample', 'USD', $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      id,
      input.ownerId,
      input.seedKey,
      input.title,
      input.ruleText,
      input.ruleHash,
      input.referenceAt,
      input.totalCents,
      input.shareCents,
      input.headcount,
      input.deadlineAt,
      input.timezone,
      input.graceName,
      input.graceUntil,
      input.demoNow,
      input.confirmedAt,
    ],
  );
  return id;
}

/** Deletes every contract an owner has. Shares, operations and events go with them. The schema refuses if live money exists. */
export async function deleteAllByOwner(db: Db, ownerId: string): Promise<void> {
  await db.query("DELETE FROM contracts WHERE owner_id = $1", [ownerId]);
}
