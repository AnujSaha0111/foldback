import type { Pool, PoolClient } from "pg";

type Db = Pick<Pool | PoolClient, "query">;

export type UserKind = "member" | "guest";

/** A user as the rest of the app sees them. The password hash is never part of it. */
export interface User {
  id: string;
  kind: UserKind;
  email: string | null;
  displayName: string;
  expiresAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

/** Only login reads the hash, through `findCredentialsByEmail`. */
export interface Credentials {
  user: User;
  passwordHash: string;
}

interface UserRow {
  id: string;
  kind: UserKind;
  email: string | null;
  display_name: string;
  expires_at: Date | null;
  created_at: Date;
  last_login_at: Date | null;
}

const COLUMNS = "id, kind, email, display_name, expires_at, created_at, last_login_at";

function toUser(row: UserRow): User {
  return {
    id: row.id,
    kind: row.kind,
    email: row.email,
    displayName: row.display_name,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

/** Inserts a member. Returns null when the email is already taken (case-insensitive), without raising an error. */
export async function insertMember(
  db: Db,
  input: { id: string; email: string; passwordHash: string; displayName: string },
): Promise<User | null> {
  const result = await db.query<UserRow>(
    `INSERT INTO users (id, kind, email, password_hash, display_name)
     VALUES ($1, 'member', $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING ${COLUMNS}`,
    [input.id, input.email, input.passwordHash, input.displayName],
  );
  const row = result.rows[0];
  return row ? toUser(row) : null;
}

export async function insertGuest(
  db: Db,
  input: { id: string; displayName: string; expiresAt: Date },
): Promise<User> {
  const result = await db.query<UserRow>(
    `INSERT INTO users (id, kind, display_name, expires_at)
     VALUES ($1, 'guest', $2, $3)
     RETURNING ${COLUMNS}`,
    [input.id, input.displayName, input.expiresAt],
  );
  const row = result.rows[0];
  if (!row) throw new Error("insertGuest returned no row");
  return toUser(row);
}

export async function findById(db: Db, id: string): Promise<User | null> {
  const result = await db.query<UserRow>(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row ? toUser(row) : null;
}

/** The user and password hash for a login attempt. Null for an unknown email and for guests (they have no email). */
export async function findCredentialsByEmail(db: Db, email: string): Promise<Credentials | null> {
  const result = await db.query<UserRow & { password_hash: string }>(
    `SELECT ${COLUMNS}, password_hash FROM users WHERE email = $1 AND kind = 'member'`,
    [email],
  );
  const row = result.rows[0];
  return row ? { user: toUser(row), passwordHash: row.password_hash } : null;
}

export async function touchLastLogin(db: Db, id: string): Promise<void> {
  await db.query("UPDATE users SET last_login_at = now() WHERE id = $1", [id]);
}

/**
 * Deletes expired guests who hold no live money, and everything they own (cascade). "Live money" mirrors the
 * schema's delete guard exactly: a held, unknown or failed sandbox share, or one with an authorize, capture or
 * void call still in flight. Such a guest is skipped, so a hold is never orphaned. If the check were narrower
 * than the guard, one guest would make the whole statement fail. Returns how many were removed.
 */
export async function deleteExpiredGuestsWithoutLiveMoney(db: Db): Promise<number> {
  const result = await db.query(
    `DELETE FROM users u
      WHERE u.kind = 'guest' AND u.expires_at < now()
        AND NOT EXISTS (
          SELECT 1 FROM contracts c JOIN shares s ON s.contract_id = c.id
           WHERE c.owner_id = u.id AND s.money_source = 'sandbox'
             AND (s.status IN ('held', 'authorize_unknown', 'capture_unknown', 'void_unknown', 'capture_failed')
                  OR EXISTS (SELECT 1 FROM paypal_operations o
                              WHERE o.share_id = s.id AND o.outcome IN ('pending', 'unknown')
                                AND o.kind IN ('authorize', 'capture', 'void'))))`,
  );
  return result.rowCount ?? 0;
}

/** Locks the user's row until the transaction ends, so two requests that rebuild one user's data run one after the other. */
export async function lockUserRow(client: PoolClient, id: string): Promise<void> {
  await client.query("SELECT 1 FROM users WHERE id = $1 FOR UPDATE", [id]);
}
