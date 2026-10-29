import { newId } from "../../src/db/ids";
import { withContractLock, withTransaction } from "../../src/db/tx";
import { lockContractRow } from "../../src/repositories/contracts.repo";
import { insertGuest } from "../../src/repositories/users.repo";
import { count, createPools, member, prepareDatabase, seedContract, truncateAll } from "../helpers/db";
import type { Pools } from "../helpers/db";

let pools: Pools;

beforeAll(async () => {
  pools = createPools();
  await prepareDatabase(pools.owner);
});

beforeEach(async () => {
  await truncateAll(pools.owner);
});

afterAll(async () => {
  await pools.app.end();
  await pools.owner.end();
});

async function advisoryLocks(): Promise<number> {
  const res = await pools.owner.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory'",
  );
  return res.rows[0]?.n ?? 0;
}

async function waitForLock(): Promise<void> {
  for (let i = 0; i < 100; i += 1) {
    if ((await advisoryLocks()) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("the lock was never taken");
}

describe("withTransaction", () => {
  it("commits when the function resolves", async () => {
    const id = newId("usr");
    await withTransaction(pools.app, (client) =>
      insertGuest(client, { id, displayName: "G", expiresAt: new Date(Date.now() + 86_400_000) }),
    );
    expect(await count(pools.owner, "users", "id = $1", [id])).toBe(1);
  });

  it("rolls back when the function throws, and passes the error on", async () => {
    const id = newId("usr");
    await expect(
      withTransaction(pools.app, async (client) => {
        await insertGuest(client, { id, displayName: "G", expiresAt: new Date(Date.now() + 86_400_000) });
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await count(pools.owner, "users", "id = $1", [id])).toBe(0);
  });

  it("returns the connection to the pool every time", async () => {
    for (let i = 0; i < 25; i += 1) {
      await expect(withTransaction(pools.app, () => Promise.reject(new Error("again")))).rejects.toThrow(
        "again",
      );
    }
    expect(pools.app.waitingCount).toBe(0);
    await expect(withTransaction(pools.app, () => Promise.resolve("still works"))).resolves.toBe(
      "still works",
    );
  });
});

describe("withContractLock", () => {
  it("lets one request in and refuses the second with 409 resolve_in_progress", async () => {
    let open!: () => void;
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    const first = withContractLock(pools.app, "con_busy", async () => {
      await gate;
      return "first";
    });
    await waitForLock();

    await expect(
      withContractLock(pools.app, "con_busy", () => Promise.resolve("second")),
    ).rejects.toMatchObject({
      code: "resolve_in_progress",
      status: 409,
    });

    open();
    await expect(first).resolves.toBe("first");
  });

  it("does not block a different contract", async () => {
    let open!: () => void;
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    const first = withContractLock(pools.app, "con_one", async () => {
      await gate;
    });
    await waitForLock();
    await expect(withContractLock(pools.app, "con_two", () => Promise.resolve("ok"))).resolves.toBe("ok");
    open();
    await first;
  });

  it("releases the lock when the function throws, so the next request can run", async () => {
    await expect(
      withContractLock(pools.app, "con_throws", () => Promise.reject(new Error("failed inside"))),
    ).rejects.toThrow("failed inside");
    await expect(withContractLock(pools.app, "con_throws", () => Promise.resolve("next"))).resolves.toBe(
      "next",
    );
  });

  it("leaves no advisory lock behind on any connection", async () => {
    await withContractLock(pools.app, "con_clean", () => Promise.resolve());
    await expect(
      withContractLock(pools.app, "con_clean", () => Promise.reject(new Error("x"))),
    ).rejects.toThrow();
    expect(await advisoryLocks()).toBe(0);
  });

  it("lets the function open its own transactions while the lock is held", async () => {
    const id = newId("usr");
    await withContractLock(pools.app, "con_inner", () =>
      withTransaction(pools.app, (client) =>
        insertGuest(client, { id, displayName: "G", expiresAt: new Date(Date.now() + 86_400_000) }),
      ),
    );
    expect(await count(pools.owner, "users", "id = $1", [id])).toBe(1);
  });
});

describe("lockContractRow", () => {
  it("finds an existing contract and reports a missing one", async () => {
    const owner = await member(pools.owner);
    const contractId = await seedContract(pools.app, owner);
    const found = await withTransaction(pools.app, (client) => lockContractRow(client, contractId));
    const missing = await withTransaction(pools.app, (client) => lockContractRow(client, newId("con")));
    expect(found).toBe(true);
    expect(missing).toBe(false);
  });

  it("holds the row so a second transaction waits until the first ends", async () => {
    const owner = await member(pools.owner);
    const contractId = await seedContract(pools.app, owner);
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = withTransaction(pools.app, async (client) => {
      await lockContractRow(client, contractId);
      order.push("first has the row");
      await gate;
      order.push("first done");
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const second = withTransaction(pools.app, async (client) => {
      await lockContractRow(client, contractId);
      order.push("second has the row");
    });
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(order).toEqual(["first has the row"]);

    release();
    await Promise.all([first, second]);
    expect(order).toEqual(["first has the row", "first done", "second has the row"]);
  });
});
