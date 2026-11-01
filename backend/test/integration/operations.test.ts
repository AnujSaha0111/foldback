import type { Pool } from "pg";
import { createOrderRequest, getOrderRequest } from "../../src/integrations/paypal/client";
import { insertPending, recordRead, settle } from "../../src/repositories/operations.repo";
import { ORDER_ID } from "../fixtures/paypal";
import { confirmed, createPools, expectDbError, member, prepareDatabase, truncateAll } from "../helpers/db";
import type { Pools } from "../helpers/db";
import { testEnv } from "../helpers/env";

const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";

let pools: Pools;
let app: Pool;
let shareId: string;

beforeAll(async () => {
  pools = createPools();
  app = pools.app;
  await prepareDatabase(pools.owner);
});

beforeEach(async () => {
  await truncateAll(pools.owner);
  const { shareIds } = await confirmed(app, await member(app));
  shareId = shareIds[0] ?? "";
});

afterAll(async () => {
  await pools.app.end();
  await pools.owner.end();
});

function orderRequest(checkoutAttempt = 1) {
  return createOrderRequest(testEnv(), {
    shareId,
    checkoutAttempt,
    amountCents: 8000,
    title: "Cabin weekend",
    displayName: "Maya Shah",
  });
}

async function row(id: string) {
  const result = await app.query<{
    outcome: string;
    idempotency_key: string | null;
    request: { method: string; path: string; body: unknown; key?: string };
    response: unknown;
    response_status: number | null;
    paypal_debug_id: string | null;
  }>("SELECT * FROM paypal_operations WHERE id = $1", [id]);
  const found = result.rows[0];
  if (found === undefined) throw new Error("no such operation");
  return found;
}

const COMPLETED = { outcome: "completed", status: 201, debugId: "debug-1", response: { id: "O1" } } as const;

describe("operations.repo", () => {
  it("records a write before it is sent, then its result", async () => {
    const request = orderRequest();
    const id = await insertPending(app, { shareId, kind: "create_order", request });
    expect(await row(id)).toMatchObject({
      outcome: "pending",
      idempotency_key: request.key,
      request: { method: "POST", path: request.path },
      response: null,
    });

    await settle(app, id, COMPLETED);
    expect(await row(id)).toMatchObject({
      outcome: "completed",
      response_status: 201,
      paypal_debug_id: "debug-1",
      response: { id: "O1" },
    });
  });

  it("stores a call that had no reply", async () => {
    const id = await insertPending(app, { shareId, kind: "create_order", request: orderRequest() });
    await settle(app, id, {
      outcome: "unknown",
      status: null,
      debugId: null,
      response: { error: "TimeoutError" },
    });
    expect(await row(id)).toMatchObject({
      outcome: "unknown",
      response_status: null,
      response: { error: "TimeoutError" },
    });
  });

  it("refuses a second write in flight for the share", async () => {
    await insertPending(app, { shareId, kind: "create_order", request: orderRequest(1) });
    await expectDbError(insertPending(app, { shareId, kind: "create_order", request: orderRequest(2) }), {
      code: UNIQUE_VIOLATION,
      constraint: "ops_one_inflight_per_share",
    });
  });

  it("refuses a live key used again, and allows it after a failure", async () => {
    const first = await insertPending(app, { shareId, kind: "create_order", request: orderRequest() });
    await settle(app, first, COMPLETED);
    await expectDbError(insertPending(app, { shareId, kind: "create_order", request: orderRequest() }), {
      code: UNIQUE_VIOLATION,
      constraint: "ops_one_live_per_key",
    });

    const next = await insertPending(app, { shareId, kind: "create_order", request: orderRequest(2) });
    await settle(app, next, { outcome: "failed", status: 422, debugId: null, response: {} });
    await insertPending(app, { shareId, kind: "create_order", request: orderRequest(2) });
  });

  it("cannot change a settled row", async () => {
    const id = await insertPending(app, { shareId, kind: "create_order", request: orderRequest() });
    await settle(app, id, COMPLETED);
    await expectDbError(settle(app, id, { ...COMPLETED, outcome: "failed" }), {
      code: CHECK_VIOLATION,
      constraint: "ops_settled_immutable",
    });
  });

  it("throws when there is no such row", async () => {
    await expect(settle(app, "op_aaaaaaaaaaaaaaaaaaaaaa", COMPLETED)).rejects.toThrow("to settle");
  });

  it("logs a read straight away, and it takes no in-flight slot", async () => {
    const request = getOrderRequest(ORDER_ID);
    await insertPending(app, { shareId, kind: "create_order", request: orderRequest() });
    await recordRead(app, { shareId, kind: "get_order", request, result: COMPLETED });
    const reads = await app.query<{ outcome: string; idempotency_key: string | null }>(
      "SELECT outcome, idempotency_key FROM paypal_operations WHERE kind = 'get_order'",
    );
    expect(reads.rows).toEqual([{ outcome: "completed", idempotency_key: null }]);
  });
});
