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

/** The contract a pay link belongs to. Public on purpose: the unguessable share id is the permission. */
export async function findByShare(db: Db, shareId: string): Promise<ContractRow | null> {
  const result = await db.query<RawContractRow>(
    `${CONTRACT_SELECT} WHERE c.id = (SELECT contract_id FROM shares WHERE id = $1) GROUP BY c.id`,
    [shareId],
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

/** A contract still before its confirm step, locked for the caller. The rule text and clock are what extraction needs. */
export interface DraftContract {
  id: string;
  status: ContractStatus;
  ruleText: string;
  referenceAt: Date;
  clarifyRounds: number;
  clarificationQuestion: string | null;
  extraction: unknown;
}

interface RawDraftRow {
  id: string;
  status: ContractStatus;
  rule_text: string;
  reference_at: Date;
  clarify_rounds: number;
  clarification_question: string | null;
  extraction: unknown;
}

/** Starts a plan: a sandbox contract in `extracting`, with nothing decided. Returns its id. */
export async function insertDraft(
  db: Db,
  input: { ownerId: string; ruleText: string; ruleHash: string; referenceAt: Date },
): Promise<string> {
  const id = newId("con");
  await db.query(
    `INSERT INTO contracts (id, owner_id, rule_text, rule_hash, reference_at, status, money_source)
     VALUES ($1, $2, $3, $4, $5, 'extracting', 'sandbox')`,
    [id, input.ownerId, input.ruleText, input.ruleHash, input.referenceAt],
  );
  return id;
}

const DRAFT_SELECT = `SELECT id, status, rule_text, reference_at, clarify_rounds, clarification_question, extraction
  FROM contracts WHERE id = $1 AND owner_id = $2`;

/** Locks one of the owner's contracts for the rest of the transaction. Someone else's and a missing one are both null. */
export async function lockDraft(
  client: PoolClient,
  ownerId: string,
  contractId: string,
): Promise<DraftContract | null> {
  const result = await client.query<RawDraftRow>(`${DRAFT_SELECT} FOR UPDATE`, [contractId, ownerId]);
  return toDraft(result.rows[0]);
}

/** The same read without the lock, for checks made before a transaction starts. */
export async function findOwnedDraft(
  db: Db,
  ownerId: string,
  contractId: string,
): Promise<DraftContract | null> {
  const result = await db.query<RawDraftRow>(DRAFT_SELECT, [contractId, ownerId]);
  return toDraft(result.rows[0]);
}

function toDraft(row: RawDraftRow | undefined): DraftContract | null {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    ruleText: row.rule_text,
    referenceAt: row.reference_at,
    clarifyRounds: row.clarify_rounds,
    clarificationQuestion: row.clarification_question,
    extraction: row.extraction,
  };
}

/** Plans the owner created themselves, not the two samples. With no owner, every user's plans: the whole-demo cap. */
export async function countOwnPlans(db: Db, ownerId: string | null): Promise<number> {
  const result = await db.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM contracts WHERE seed_key IS NULL AND ($1::text IS NULL OR owner_id = $1)",
    [ownerId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

/** The newest stored reading of exactly this text and paste time, from anyone, no older than `hours`. */
export async function findCachedExtraction(db: Db, ruleHash: string, hours: number): Promise<unknown> {
  const result = await db.query<{ extraction: unknown }>(
    `SELECT extraction FROM contracts
      WHERE rule_hash = $1 AND extraction IS NOT NULL AND created_at > now() - make_interval(hours => $2)
      ORDER BY created_at DESC LIMIT 1`,
    [ruleHash, hours],
  );
  return result.rows[0]?.extraction ?? null;
}

/** The organizer answered a question: the answer joins the text and the plan goes back to being read. */
export async function startClarification(
  client: PoolClient,
  contractId: string,
  input: { ruleText: string; ruleHash: string },
): Promise<void> {
  await client.query(
    `UPDATE contracts SET rule_text = $2, rule_hash = $3, status = 'extracting', clarify_rounds = clarify_rounds + 1
      WHERE id = $1`,
    [contractId, input.ruleText, input.ruleHash],
  );
}

export interface Reading {
  status: "needs_clarification" | "awaiting_confirmation";
  extraction: unknown;
  question: string | null;
}

/** Stores what the rule reader made of the text. Returns the new version, or null if the plan is gone or moved on. */
export async function saveReading(db: Db, contractId: string, reading: Reading): Promise<number | null> {
  const stored = reading.extraction === null ? null : JSON.stringify(reading.extraction);
  const result = await db.query<{ version: number }>(
    `UPDATE contracts SET status = $2, extraction = $3::jsonb, clarification_question = $4
      WHERE id = $1 AND status = 'extracting' RETURNING version`,
    [contractId, reading.status, stored, reading.question],
  );
  return result.rows[0]?.version ?? null;
}

/** The model could not be called (the budget stopped it): back to asking, with the previous question kept. */
export async function returnToClarification(db: Db, contractId: string): Promise<void> {
  await db.query(
    "UPDATE contracts SET status = 'needs_clarification' WHERE id = $1 AND status = 'extracting'",
    [contractId],
  );
}

/**
 * Plans stuck in `extracting` because the server stopped mid-read. One that was already asking goes back to asking;
 * a brand-new one is removed. Returns how many were repaired or removed.
 */
export async function repairStaleDrafts(db: Db, minutes: number): Promise<number> {
  const asking = await db.query(
    `UPDATE contracts SET status = 'needs_clarification'
      WHERE status = 'extracting' AND clarify_rounds > 0 AND updated_at < now() - make_interval(mins => $1)`,
    [minutes],
  );
  const fresh = await db.query(
    `DELETE FROM contracts
      WHERE status = 'extracting' AND clarify_rounds = 0 AND updated_at < now() - make_interval(mins => $1)`,
    [minutes],
  );
  return (asking.rowCount ?? 0) + (fresh.rowCount ?? 0);
}

/** A plan that never got a reading. */
export async function deleteDraft(db: Db, contractId: string): Promise<void> {
  await db.query("DELETE FROM contracts WHERE id = $1 AND status = 'extracting'", [contractId]);
}

export interface ConfirmedTerms {
  title: string;
  currency: string;
  totalCents: number;
  shareCents: number;
  headcount: number;
  deadlineAt: string;
  timezone: string;
  graceName: string | null;
  graceUntil: string | null;
}

/** Writes the confirmed terms into the contract, still unconfirmed, so the share inserts can be checked against them. */
export async function applyTerms(
  client: PoolClient,
  contractId: string,
  terms: ConfirmedTerms,
): Promise<void> {
  await client.query(
    `UPDATE contracts SET title = $2, currency = $3, total_cents = $4, share_cents = $5, headcount = $6,
            deadline_at = $7, timezone = $8, grace_person_name = $9, grace_until = $10
      WHERE id = $1`,
    [
      contractId,
      terms.title,
      terms.currency,
      terms.totalCents,
      terms.shareCents,
      terms.headcount,
      terms.deadlineAt,
      terms.timezone,
      terms.graceName,
      terms.graceUntil,
    ],
  );
}

/** The last step of confirm. At commit the database checks that the shares match the terms exactly. Returns the version. */
export async function activate(client: PoolClient, contractId: string, demoNow: string): Promise<number> {
  const result = await client.query<{ version: number }>(
    `UPDATE contracts SET status = 'active', confirmed_at = now(), demo_now = $2, clarification_question = NULL
      WHERE id = $1 RETURNING version`,
    [contractId, demoNow],
  );
  return result.rows[0]?.version ?? 0;
}
