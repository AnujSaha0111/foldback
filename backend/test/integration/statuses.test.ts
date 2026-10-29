import { CONTRACT_STATUSES, SHARE_STATUSES } from "../../src/shared/statuses";
import { createPools, prepareDatabase } from "../helpers/db";
import type { Pools } from "../helpers/db";

let pools: Pools;

beforeAll(async () => {
  pools = createPools();
  await prepareDatabase(pools.owner);
});

afterAll(async () => {
  await pools.app.end();
  await pools.owner.end();
});

async function checkValues(constraint: string): Promise<string[]> {
  const res = await pools.owner.query<{ def: string }>(
    "SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1",
    [constraint],
  );
  const def = res.rows[0]?.def ?? "";
  return [...def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1] ?? "").sort();
}

async function transitionStatuses(table: "contract_transitions" | "share_transitions"): Promise<string[]> {
  const res = await pools.owner.query<{ s: string }>(
    `SELECT from_status AS s FROM ${table} UNION SELECT to_status FROM ${table}`,
  );
  return res.rows.map((r) => r.s).sort();
}

describe("status lists match the database", () => {
  it("contract statuses equal the CHECK constraint", async () => {
    expect(await checkValues("contracts_status_valid")).toEqual([...CONTRACT_STATUSES].sort());
  });

  it("share statuses equal the CHECK constraint", async () => {
    expect(await checkValues("shares_status_valid")).toEqual([...SHARE_STATUSES].sort());
  });

  it("the transition tables only use known statuses", async () => {
    const known = (list: readonly string[]) => new Set(list);
    const contractKnown = known(CONTRACT_STATUSES);
    const shareKnown = known(SHARE_STATUSES);
    expect((await transitionStatuses("contract_transitions")).every((s) => contractKnown.has(s))).toBe(true);
    expect((await transitionStatuses("share_transitions")).every((s) => shareKnown.has(s))).toBe(true);
  });
});
