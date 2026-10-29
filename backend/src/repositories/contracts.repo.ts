import type { Pool, PoolClient } from "pg";
import { newId } from "../db/ids";
import type { ContractStatus, Direction, MoneySource } from "../shared/statuses";

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

/** A contract with the counts the read model derives from its shares. Dates are real Dates, ids are strings. */
export interface ContractRow {
  id: string;
  seedKey: string | null;
  title: string | null;
  status: ContractStatus;
  direction: Direction | null;
  moneySource: MoneySource;
  currency: string | null;
  totalCents: number | null;
  shareCents: number | null;
  headcount: number | null;
  heldCount: number;
  keptCount: number;
  releasedCount: number;
  deadlineAt: Date | null;
  timezone: string | null;
  graceName: string | null;
  graceUntil: Date | null;
  demoNow: Date | null;
  resolutionReason: string | null;
  clarificationQuestion: string | null;
  extraction: unknown;
  version: number;
}

interface RawContractRow {
  id: string;
  seed_key: string | null;
  title: string | null;
  status: ContractStatus;
  direction: Direction | null;
  money_source: MoneySource;
  currency: string | null;
  total_cents: number | null;
  share_cents: number | null;
  headcount: number | null;
  held_count: number;
  kept_count: number;
  released_count: number;
  deadline_at: Date | null;
  timezone: string | null;
  grace_person_name: string | null;
  grace_until: Date | null;
  demo_now: Date | null;
  resolution_reason: string | null;
  clarification_question: string | null;
  extraction: unknown;
  version: number;
}

// The count columns are derived on every read, never stored, so they cannot drift from the shares.
const CONTRACT_SELECT = `
  SELECT c.id, c.seed_key, c.title, c.status, c.direction, c.money_source, c.currency, c.total_cents,
         c.share_cents, c.headcount, c.deadline_at, c.timezone, c.grace_person_name, c.grace_until,
         c.demo_now, c.resolution_reason, c.clarification_question, c.extraction, c.version,
         count(s.id) FILTER (WHERE s.status = 'held')::int AS held_count,
         count(s.id) FILTER (WHERE s.status = 'kept')::int AS kept_count,
         count(s.id) FILTER (WHERE s.status = 'released')::int AS released_count
    FROM contracts c LEFT JOIN shares s ON s.contract_id = c.id`;

function toContract(row: RawContractRow): ContractRow {
  return {
    id: row.id,
    seedKey: row.seed_key,
    title: row.title,
    status: row.status,
    direction: row.direction,
    moneySource: row.money_source,
    currency: row.currency,
    totalCents: row.total_cents,
    shareCents: row.share_cents,
    headcount: row.headcount,
    heldCount: row.held_count,
    keptCount: row.kept_count,
    releasedCount: row.released_count,
    deadlineAt: row.deadline_at,
    timezone: row.timezone,
    graceName: row.grace_person_name,
    graceUntil: row.grace_until,
    demoNow: row.demo_now,
    resolutionReason: row.resolution_reason,
    clarificationQuestion: row.clarification_question,
    extraction: row.extraction,
    version: row.version,
  };
}

/** An owner's contracts, oldest first. The two samples (created together) come out cabin first, then print run. */
export async function listByOwner(db: Db, ownerId: string): Promise<ContractRow[]> {
  const result = await db.query<RawContractRow>(
    `${CONTRACT_SELECT} WHERE c.owner_id = $1
      GROUP BY c.id ORDER BY c.created_at ASC, c.seed_key ASC NULLS LAST, c.id ASC`,
    [ownerId],
  );
  return result.rows.map(toContract);
}

/**
 * One contract, only if this owner owns it. Someone else's contract and a missing one look the same (null), so a
 * caller cannot probe which ids exist.
 */
export async function findOwned(db: Db, ownerId: string, contractId: string): Promise<ContractRow | null> {
  const result = await db.query<RawContractRow>(
    `${CONTRACT_SELECT} WHERE c.owner_id = $1 AND c.id = $2 GROUP BY c.id`,
    [ownerId, contractId],
  );
  const row = result.rows[0];
  return row ? toContract(row) : null;
}

/** Cheap ownership check for the socket room join. */
export async function ownsContract(db: Db, ownerId: string, contractId: string): Promise<boolean> {
  const result = await db.query("SELECT 1 FROM contracts WHERE id = $1 AND owner_id = $2", [
    contractId,
    ownerId,
  ]);
  return result.rowCount === 1;
}
