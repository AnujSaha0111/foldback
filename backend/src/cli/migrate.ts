// Usage: yarn migrate | yarn migrate:status | yarn migrate:reset
import { applyMigrations, migrationStatus, resetSchema } from "../db/migrator";
import { runAsOwner } from "./owner";

const command = process.argv[2];

// Migrations run as the table OWNER. The running app uses DATABASE_URL (a DML-only role).
runAsOwner(process.env["MIGRATE_DATABASE_URL"] ?? process.env["DATABASE_URL"], async (pool) => {
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
});
