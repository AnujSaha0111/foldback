import type { Pool, PoolClient } from "pg";
import { newId } from "../db/ids";

type Db = Pick<Pool | PoolClient, "query">;

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
  await db.query(
    `INSERT INTO shares (id, contract_id, money_source, position, display_name, is_grace_subject, status,
       amount_cents, sample_label)
     VALUES ${rows.join(", ")}`,
    values,
  );
}
