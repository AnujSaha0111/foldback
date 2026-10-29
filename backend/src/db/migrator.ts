import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Pool, PoolClient } from "pg";

export const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");

// Any constant works. It makes two processes that migrate at the same time take turns.
const MIGRATION_LOCK_KEY = 727_274;

export interface MigrationFile {
  version: string;
  name: string;
  sql: string;
  checksum: string;
}

export interface AppliedMigration {
  version: string;
  name: string;
  checksum: string;
  appliedAt: Date;
  checksumOk: boolean;
}

export interface MigrationStatus {
  applied: AppliedMigration[];
  pending: string[];
}

interface AppliedRow {
  version: string;
  name: string;
  checksum: string;
  applied_at: Date;
}

const FILE_PATTERN = /^(\d{4})_([a-z0-9_]+)\.sql$/;

export async function loadMigrations(dir: string = MIGRATIONS_DIR): Promise<MigrationFile[]> {
  const names = (await readdir(dir)).filter((n) => FILE_PATTERN.test(n)).sort();
  const files: MigrationFile[] = [];
  for (const fileName of names) {
    const match = FILE_PATTERN.exec(fileName);
    if (!match?.[1] || !match[2]) continue;
    const sql = await readFile(path.join(dir, fileName), "utf8");
    files.push({
      version: match[1],
      name: match[2],
      sql,
      checksum: createHash("sha256").update(sql).digest("hex"),
    });
  }
  return files;
}

async function ensureLedger(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    text PRIMARY KEY,
      name       text NOT NULL,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
}

async function readLedger(client: PoolClient): Promise<AppliedRow[]> {
  const res = await client.query<AppliedRow>(
    "SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version",
  );
  return res.rows;
}

function assertChecksums(files: MigrationFile[], applied: AppliedRow[]): void {
  for (const row of applied) {
    const file = files.find((f) => f.version === row.version);
    if (!file) throw new Error(`Migration ${row.version} was applied but its file is missing.`);
    if (file.checksum !== row.checksum) {
      throw new Error(
        `Migration ${row.version} was edited after it was applied. Write a new migration instead.`,
      );
    }
  }
}

async function applyOne(client: PoolClient, file: MigrationFile): Promise<void> {
  try {
    await client.query("BEGIN");
    await client.query(file.sql);
    await client.query("INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)", [
      file.version,
      file.name,
      file.checksum,
    ]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw new Error(`Migration ${file.version}_${file.name} failed: ${String(error)}`);
  }
}

/** Applies every pending migration, each in its own transaction. Returns the versions it applied. */
export async function applyMigrations(
  pool: Pool,
  dir: string = MIGRATIONS_DIR,
): Promise<{ applied: string[] }> {
  const files = await loadMigrations(dir);
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    await ensureLedger(client);
    const done = await readLedger(client);
    assertChecksums(files, done);
    const doneVersions = new Set(done.map((r) => r.version));
    for (const file of files.filter((f) => !doneVersions.has(f.version))) {
      await applyOne(client, file);
      applied.push(file.version);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]).catch(() => undefined);
    client.release();
  }
  return { applied };
}

export async function migrationStatus(pool: Pool, dir: string = MIGRATIONS_DIR): Promise<MigrationStatus> {
  const files = await loadMigrations(dir);
  const client = await pool.connect();
  try {
    await ensureLedger(client);
    const done = await readLedger(client);
    const doneVersions = new Set(done.map((r) => r.version));
    return {
      applied: done.map((r) => ({
        version: r.version,
        name: r.name,
        checksum: r.checksum,
        appliedAt: r.applied_at,
        checksumOk: files.find((f) => f.version === r.version)?.checksum === r.checksum,
      })),
      pending: files.filter((f) => !doneVersions.has(f.version)).map((f) => f.version),
    };
  } finally {
    client.release();
  }
}

/** True when every migration file has been applied and none was edited. Used by /health/ready. */
export async function migrationsCurrent(pool: Pool, dir: string = MIGRATIONS_DIR): Promise<boolean> {
  const status = await migrationStatus(pool, dir);
  return status.pending.length === 0 && status.applied.every((m) => m.checksumOk);
}

/** Drops everything in the public schema. Refuses to run in production. */
export async function resetSchema(pool: Pool): Promise<void> {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("Refusing to reset the database when NODE_ENV=production.");
  }
  await pool.query("DROP SCHEMA public CASCADE");
  await pool.query("CREATE SCHEMA public");
}
