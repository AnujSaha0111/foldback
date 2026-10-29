// Usage: yarn migrate | yarn migrate:status | yarn migrate:reset
import { Pool } from "pg";
import { applyMigrations, migrationStatus, resetSchema } from "../src/db/migrator";

async function main(): Promise<void> {
  const command = process.argv[2];
  // Migrations run as the table OWNER. The running app uses DATABASE_URL (a DML-only role).
  const url = process.env["MIGRATE_DATABASE_URL"] ?? process.env["DATABASE_URL"];
  if (!url) throw new Error("MIGRATE_DATABASE_URL is not set. Copy .env.example to .env.");
  const pool = new Pool({ connectionString: url });
  try {
    if (command === "migrate") {
      const { applied } = await applyMigrations(pool);
      console.log(
        applied.length ? `Applied: ${applied.join(", ")}` : "Nothing to apply. The database is up to date.",
      );
    } else if (command === "status") {
      const status = await migrationStatus(pool);
      for (const m of status.applied) {
        const flag = m.checksumOk ? "" : "  CHECKSUM MISMATCH";
        console.log(`applied  ${m.version}_${m.name}  ${m.appliedAt.toISOString()}${flag}`);
      }
      for (const v of status.pending) console.log(`pending  ${v}`);
    } else if (command === "reset") {
      await resetSchema(pool);
      console.log("Schema reset. Run `yarn migrate` to rebuild it.");
    } else {
      throw new Error("Usage: migrate | status | reset");
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(String(error));
  process.exitCode = 1;
});
