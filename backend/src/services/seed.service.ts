import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { insertSeedContract } from "../repositories/contracts.repo";
import { insertSeedShares } from "../repositories/shares.repo";
import type { SeedShareInput } from "../repositories/shares.repo";
import { CABIN_RULE_TEXT, DEFAULT_TIMEZONE, PRINT_RULE_TEXT } from "../shared/rules";

export const SEED_KEYS = ["cabin-hold", "print-full"] as const;

const SAMPLE_LABEL = "Sample — no PayPal hold";
const REFERENCE_AT = "2026-11-01T12:00:00-08:00";
const DEADLINE_AT = "2026-11-06T18:00:00-08:00";
const DEMO_NOW = "2026-11-06T16:00:00-08:00";

function share(
  name: string,
  position: number,
  status: "held" | "waiting",
  amountCents: number,
  isGraceSubject = false,
): SeedShareInput {
  return { name, position, status, amountCents, isGraceSubject, sampleLabel: SAMPLE_LABEL };
}

/** Inserts both sample plans for one user, in their starting statuses. Runs inside the caller's transaction. */
export async function seedUser(client: PoolClient, ownerId: string): Promise<void> {
  const common = {
    ownerId,
    referenceAt: REFERENCE_AT,
    confirmedAt: REFERENCE_AT,
    deadlineAt: DEADLINE_AT,
    timezone: DEFAULT_TIMEZONE,
    demoNow: DEMO_NOW,
    headcount: 4,
  };
  const hash = (text: string): string => createHash("sha256").update(text).digest("hex");

  const cabinId = await insertSeedContract(client, {
    ...common,
    seedKey: "cabin-hold",
    title: "Cabin weekend",
    ruleText: CABIN_RULE_TEXT,
    ruleHash: hash(CABIN_RULE_TEXT),
    totalCents: 32000,
    shareCents: 8000,
    graceName: "Maya Shah",
    graceUntil: "2026-11-09T18:00:00-08:00",
  });
  await insertSeedShares(client, cabinId, [
    share("Alex Chen", 1, "held", 8000),
    share("Sam Ortiz", 2, "held", 8000),
    share("Jordan Lee", 3, "held", 8000),
    share("Maya Shah", 4, "waiting", 8000, true),
  ]);

  const printId = await insertSeedContract(client, {
    ...common,
    seedKey: "print-full",
    title: "Print run",
    ruleText: PRINT_RULE_TEXT,
    ruleHash: hash(PRINT_RULE_TEXT),
    totalCents: 20000,
    shareCents: 5000,
    graceName: null,
    graceUntil: null,
  });
  await insertSeedShares(client, printId, [
    share("Priya Nair", 1, "held", 5000),
    share("Noah Brooks", 2, "held", 5000),
    share("Elena Vaz", 3, "held", 5000),
    share("Chris Dalton", 4, "held", 5000),
  ]);
}
