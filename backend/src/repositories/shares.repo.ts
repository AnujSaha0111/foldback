import type { Pool, PoolClient } from "pg";
import { newId } from "../db/ids";
import type { MoneySource, ShareStatus } from "../shared/statuses";

type Db = Pick<Pool | PoolClient, "query">;

/** A share as the read model shows it. It never includes the approval link or idempotency keys. */
export interface ShareRow {
  id: string;
  displayName: string;
  isGraceSubject: boolean;
  status: ShareStatus;
  amountCents: number;
  moneySource: MoneySource;
  sampleLabel: string | null;
  orderId: string | null;
  authorizationId: string | null;
  authorizationExpiresAt: Date | null;
  captureId: string | null;
}

interface RawShareRow {
  id: string;
  display_name: string;
  is_grace_subject: boolean;
  status: ShareStatus;
  amount_cents: number;
  money_source: MoneySource;
  sample_label: string | null;
  order_id: string | null;
  authorization_id: string | null;
  authorization_expires_at: Date | null;
  capture_id: string | null;
}

/** The shares of one contract in seat order. The caller has already checked the contract is theirs. */
export async function listForContract(db: Db, contractId: string): Promise<ShareRow[]> {
  const result = await db.query<RawShareRow>(
    `SELECT id, display_name, is_grace_subject, status, amount_cents, money_source, sample_label, order_id,
            authorization_id, authorization_expires_at, capture_id
       FROM shares WHERE contract_id = $1 ORDER BY position`,
    [contractId],
  );
  return result.rows.map((r) => ({
    id: r.id,
    displayName: r.display_name,
    isGraceSubject: r.is_grace_subject,
    status: r.status,
    amountCents: r.amount_cents,
    moneySource: r.money_source,
    sampleLabel: r.sample_label,
    orderId: r.order_id,
    authorizationId: r.authorization_id,
    authorizationExpiresAt: r.authorization_expires_at,
    captureId: r.capture_id,
  }));
}

/** True when a share with this id exists. Used by the pay-link socket room, which any holder of the link may join. */
export async function shareExists(db: Db, shareId: string): Promise<boolean> {
  const result = await db.query("SELECT 1 FROM shares WHERE id = $1", [shareId]);
  return result.rowCount === 1;
}

/** What checkout works from. It holds the approval link, so it stays on the server. */
export interface CheckoutShare {
  displayName: string;
  isGraceSubject: boolean;
  status: ShareStatus;
  amountCents: number;
  moneySource: MoneySource;
  checkoutAttempt: number;
  orderId: string | null;
  approveUrl: string | null;
}

export async function findForCheckout(db: Db, shareId: string): Promise<CheckoutShare | null> {
  const result = await db.query<{
    display_name: string;
    is_grace_subject: boolean;
    status: ShareStatus;
    amount_cents: number;
    money_source: MoneySource;
    checkout_attempt: number;
    order_id: string | null;
    approve_url: string | null;
  }>(
    `SELECT display_name, is_grace_subject, status, amount_cents, money_source, checkout_attempt, order_id, approve_url
       FROM shares WHERE id = $1`,
    [shareId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    displayName: row.display_name,
    isGraceSubject: row.is_grace_subject,
    status: row.status,
    amountCents: row.amount_cents,
    moneySource: row.money_source,
    checkoutAttempt: row.checkout_attempt,
    orderId: row.order_id,
    approveUrl: row.approve_url,
  };
}

/** Starts an attempt. A retry after a cancel drops the old order, or its dead link could be handed out again. */
export async function openCheckout(client: PoolClient, shareId: string, attempt: number): Promise<void> {
  await client.query(
    `UPDATE shares SET status = 'checkout_open', checkout_attempt = $2, order_id = NULL, approve_url = NULL
      WHERE id = $1`,
    [shareId, attempt],
  );
}

export async function storeOrder(
  client: PoolClient,
  shareId: string,
  order: { orderId: string; approveUrl: string },
): Promise<void> {
  await client.query("UPDATE shares SET order_id = $2, approve_url = $3 WHERE id = $1", [
    shareId,
    order.orderId,
    order.approveUrl,
  ]);
}

/** PayPal refused the order, so nothing exists there and the share is free again. */
export async function closeCheckout(client: PoolClient, shareId: string): Promise<void> {
  await client.query("UPDATE shares SET status = 'waiting' WHERE id = $1", [shareId]);
}

export interface SeedShareInput {
  name: string;
  position: number;
  isGraceSubject: boolean;
  status: "held" | "waiting";
  amountCents: number;
  sampleLabel: string;
}

/**
 * Inserts the shares of a sample contract directly in their starting status, in one statement.
 * Sample rows never touch PayPal.
 */
export async function insertSeedShares(db: Db, contractId: string, shares: SeedShareInput[]): Promise<void> {
  if (shares.length === 0) return;
  const values: unknown[] = [contractId];
  const rows = shares.map((share) => {
    const base = values.length;
    values.push(
      newId("shr"),
      share.position,
      share.name,
      share.isGraceSubject,
      share.status,
      share.amountCents,
      share.sampleLabel,
    );
    const p = (n: number): string => `$${base + n}`;
    return `(${p(1)}, $1, 'sample', ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)})`;
  });
  // Only generated $n placeholders are interpolated here, never values.
  /* eslint-disable no-restricted-syntax */
  await db.query(
    `INSERT INTO shares (id, contract_id, money_source, position, display_name, is_grace_subject, status,
       amount_cents, sample_label)
     VALUES ${rows.join(", ")}`,
    values,
  );
  /* eslint-enable no-restricted-syntax */
}

/** One `waiting` sandbox share per person, in the order written. The database checks each against the contract's terms. */
export async function insertWaitingShares(
  client: PoolClient,
  contractId: string,
  input: { people: string[]; amountCents: number; graceName: string | null },
): Promise<void> {
  for (const [index, name] of input.people.entries()) {
    await client.query(
      `INSERT INTO shares (id, contract_id, money_source, position, display_name, is_grace_subject, status, amount_cents)
       VALUES ($1, $2, 'sandbox', $3, $4, $5, 'waiting', $6)`,
      [newId("shr"), contractId, index + 1, name, name === input.graceName, input.amountCents],
    );
  }
}
