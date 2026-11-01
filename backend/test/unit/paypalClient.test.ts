import { PassThrough } from "node:stream";
import {
  authorizeOrderRequest,
  createOrderRequest,
  createPayPalClient,
  getAuthorizationRequest,
  getOrderRequest,
  paypalWritesOpen,
} from "../../src/integrations/paypal/client";
import type { OrderInput } from "../../src/integrations/paypal/client";
import { createLogger } from "../../src/observability/logger";
import {
  APPROVE_URL,
  HOLD_ID,
  CREATED_ORDER,
  EXPIRES,
  ORDER_ID,
  SHARE_ID,
  TOKEN,
  authorizedOrder,
  refusal,
  scriptedPayPal,
} from "../fixtures/paypal";
import type { PayPalStep } from "../fixtures/paypal";
import { testEnv } from "../helpers/env";

const KEYS = { PAYPAL_CLIENT_ID: "client-id", PAYPAL_CLIENT_SECRET: "client-secret-value" };

const INPUT: OrderInput = {
  shareId: SHARE_ID,
  checkoutAttempt: 1,
  amountCents: 8000,
  title: "Cabin weekend",
  displayName: "Maya Shah",
};

function setup(
  steps: PayPalStep[],
  options: { env?: Record<string, string | undefined>; token?: PayPalStep } = {},
) {
  const logs = new PassThrough();
  let logged = "";
  logs.on("data", (chunk: Buffer) => (logged += chunk.toString()));
  const env = testEnv({ ...KEYS, ...options.env });
  const paypal = scriptedPayPal(steps, options.token);
  const client = createPayPalClient({
    env,
    fetch: paypal.fetch,
    logger: createLogger({ level: "debug", json: true, stream: logs }),
  });
  return { client, env, paypal, logged: () => logged };
}

const orderBody = (input: OrderInput = INPUT) => {
  const body = createOrderRequest(testEnv(), input).body as {
    purchase_units: { description: string; amount: { value: string } }[];
  };
  const [unit] = body.purchase_units;
  if (unit === undefined) throw new Error("no purchase unit");
  return unit;
};

describe("order request", () => {
  it("is an AUTHORIZE order with a per-attempt key and return links on our domain", () => {
    const env = testEnv({ APP_BASE_URL: "https://app.example.com/" });
    const request = createOrderRequest(env, { ...INPUT, checkoutAttempt: 3 });
    expect(request).toMatchObject({
      method: "POST",
      path: "/v2/checkout/orders",
      key: `fb-order-${SHARE_ID}-3`,
      body: {
        intent: "AUTHORIZE",
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "Foldback",
              shipping_preference: "NO_SHIPPING",
              user_action: "PAY_NOW",
              return_url: `https://app.example.com/pay/${SHARE_ID}`,
              cancel_url: `https://app.example.com/pay/${SHARE_ID}?cancelled=1`,
            },
          },
        },
        purchase_units: [
          {
            reference_id: SHARE_ID,
            custom_id: SHARE_ID,
            invoice_id: `foldback-${SHARE_ID}-3`,
            description: "Foldback hold: Cabin weekend share for Maya Shah",
            amount: { currency_code: "USD", value: "80.00" },
          },
        ],
      },
    });
    expect(request.body).not.toHaveProperty("application_context");
  });

  it.each([
    [8000, "80.00"],
    [1999, "19.99"],
    [5, "0.05"],
    [29, "0.29"],
    [1000000, "10000.00"],
  ])("turns %i cents into %s", (amountCents, value) => {
    expect(orderBody({ ...INPUT, amountCents }).amount.value).toBe(value);
  });

  it("fits a long title and name into PayPal's 127 characters", () => {
    const description = orderBody({
      ...INPUT,
      title: "T".repeat(120),
      displayName: "N".repeat(80),
    }).description;
    expect(description).toHaveLength(127);
  });

  it("never leaves half of an emoji at the cut", () => {
    const title = `${"T".repeat(111)}😀😀`;
    const { description } = orderBody({ ...INPUT, title });
    expect(description).toHaveLength(126);
    expect(description.endsWith("T")).toBe(true);
  });
});

describe("other requests", () => {
  it("authorize has an empty body and a key derived from the order", () => {
    expect(authorizeOrderRequest(ORDER_ID)).toEqual({
      method: "POST",
      path: `/v2/checkout/orders/${ORDER_ID}/authorize`,
      key: `fb-auth-${ORDER_ID}`,
      body: {},
    });
  });

  it("escapes an id, so a value from the browser cannot change the path", () => {
    expect(getOrderRequest("../../x?y=1").path).toBe("/v2/checkout/orders/..%2F..%2Fx%3Fy%3D1");
    expect(getAuthorizationRequest("a/b").path).toBe("/v2/payments/authorizations/a%2Fb");
  });
});

describe("token", () => {
  it("uses basic auth and form encoding, and is cached between calls", async () => {
    const { client, paypal } = setup([{ body: authorizedOrder() }, { body: authorizedOrder() }]);
    await client.getOrder(getOrderRequest(ORDER_ID));
    await client.getOrder(getOrderRequest(ORDER_ID));

    expect(paypal.tokenCalls()).toHaveLength(1);
    const [call] = paypal.tokenCalls();
    expect(call?.url).toBe("https://api-m.sandbox.paypal.com/v1/oauth2/token");
    expect(call?.method).toBe("POST");
    expect(call?.body).toBe("grant_type=client_credentials");
    expect(call?.headers["content-type"]).toBe("application/x-www-form-urlencoded");
    const basic = Buffer.from("client-id:client-secret-value").toString("base64");
    expect(call?.headers["authorization"]).toBe(`Basic ${basic}`);
    expect(paypal.apiCalls()[0]?.headers["authorization"]).toBe(`Bearer ${TOKEN.access_token}`);
  });

  it("is fetched again 60 seconds before it expires, not after", async () => {
    const { client, paypal } = setup([
      { body: authorizedOrder() },
      { body: authorizedOrder() },
      { body: authorizedOrder() },
    ]);
    const start = Date.now();
    const clock = jest.spyOn(Date, "now");
    try {
      clock.mockReturnValue(start);
      await client.getOrder(getOrderRequest(ORDER_ID));
      clock.mockReturnValue(start + (TOKEN.expires_in - 61) * 1000);
      await client.getOrder(getOrderRequest(ORDER_ID));
      expect(paypal.tokenCalls()).toHaveLength(1);
      clock.mockReturnValue(start + (TOKEN.expires_in - 60) * 1000);
      await client.getOrder(getOrderRequest(ORDER_ID));
      expect(paypal.tokenCalls()).toHaveLength(2);
    } finally {
      clock.mockRestore();
    }
  });

  it("is dropped after a 401, so the next call gets a fresh one", async () => {
    const { client, paypal } = setup([
      { status: 401, body: { name: "AUTHENTICATION_FAILURE" } },
      { body: authorizedOrder() },
    ]);
    const first = await client.getOrder(getOrderRequest(ORDER_ID));
    expect(first).toMatchObject({ outcome: "failed", status: 401, name: "AUTHENTICATION_FAILURE" });
    await client.getOrder(getOrderRequest(ORDER_ID));
    expect(paypal.tokenCalls()).toHaveLength(2);
  });

  it.each<[string, PayPalStep]>([
    ["a refusal", { status: 401, body: { error: "invalid_client" } }],
    ["a network error", { fail: "network" }],
    ["a body without a token", { body: { expires_in: 100 } }],
  ])("%s means the call was never sent, which is a definite failure", async (_name, token) => {
    const { client, paypal } = setup([], { token });
    const result = await client.authorizeOrder(authorizeOrderRequest(ORDER_ID));
    expect(result).toEqual({
      outcome: "failed",
      status: null,
      debugId: null,
      response: { error: "paypal_token_unavailable" },
      name: "paypal_token_unavailable",
      issue: null,
    });
    expect(paypal.apiCalls()).toHaveLength(0);
  });

  it("and the secret never reach the logs", async () => {
    const { client, logged } = setup([
      { status: 422, body: refusal("UNPROCESSABLE_ENTITY", "X") },
      { fail: "network" },
    ]);
    await client.authorizeOrder(authorizeOrderRequest(ORDER_ID));
    await client.getOrder(getOrderRequest(ORDER_ID));
    const lines = logged();
    expect(lines).toContain("paypal");
    expect(lines).not.toContain(TOKEN.access_token);
    expect(lines).not.toContain(KEYS.PAYPAL_CLIENT_SECRET);
  });
});

describe("headers", () => {
  it("a write sends the key, JSON and return=representation", async () => {
    const { client, paypal } = setup([{ status: 201, body: CREATED_ORDER }]);
    await client.createOrder(createOrderRequest(testEnv(), INPUT));
    const [call] = paypal.apiCalls();
    expect(call?.url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders");
    expect(call?.method).toBe("POST");
    expect(call?.headers["paypal-request-id"]).toBe(`fb-order-${SHARE_ID}-1`);
    expect(call?.headers["content-type"]).toBe("application/json");
    expect(call?.headers["prefer"]).toBe("return=representation");
    expect(JSON.parse(call?.body ?? "")).toEqual(createOrderRequest(testEnv(), INPUT).body);
  });

  it("a call never follows a redirect", async () => {
    const { client, paypal } = setup([{ status: 201, body: authorizedOrder() }, { body: authorizedOrder() }]);
    await client.authorizeOrder(authorizeOrderRequest(ORDER_ID));
    await client.getOrder(getOrderRequest(ORDER_ID));
    expect(paypal.apiCalls().map((call) => call.redirect)).toEqual(["manual", "manual"]);
  });

  it("a read sends no key and no body", async () => {
    const { client, paypal } = setup([{ body: authorizedOrder() }]);
    await client.getOrder(getOrderRequest(ORDER_ID));
    const [call] = paypal.apiCalls();
    expect(call?.method).toBe("GET");
    expect(call?.headers).not.toHaveProperty("paypal-request-id");
    expect(call?.body).toBeUndefined();
  });

  it("a repeated authorize sends the same key", async () => {
    const { client, paypal } = setup([{ fail: "timeout" }, { status: 201, body: authorizedOrder() }]);
    await client.authorizeOrder(authorizeOrderRequest(ORDER_ID));
    await client.authorizeOrder(authorizeOrderRequest(ORDER_ID));
    const keys = paypal.apiCalls().map((call) => call.headers["paypal-request-id"]);
    expect(keys).toEqual([`fb-auth-${ORDER_ID}`, `fb-auth-${ORDER_ID}`]);
  });
});

describe("createOrder", () => {
  const create = (step: PayPalStep) => setup([step]).client.createOrder(createOrderRequest(testEnv(), INPUT));

  it("returns the order id and the approval link", async () => {
    const result = await create({ status: 201, body: CREATED_ORDER });
    expect(result).toMatchObject({
      outcome: "completed",
      status: 201,
      debugId: "debug-1",
      value: { orderId: ORDER_ID, approveUrl: APPROVE_URL },
    });
  });

  it("accepts the older shape: CREATED with an approve link, on a 200 replay", async () => {
    const body = { id: ORDER_ID, status: "CREATED", links: [{ rel: "approve", href: APPROVE_URL }] };
    expect(await create({ status: 200, body })).toMatchObject({ outcome: "completed" });
  });

  it.each<[string, unknown]>([
    ["no id", { ...CREATED_ORDER, id: undefined }],
    ["no approval link", { ...CREATED_ORDER, links: [] }],
    ["an unexpected status", { ...CREATED_ORDER, status: "COMPLETED" }],
    [
      "a link outside the sandbox, which the database would refuse",
      { ...CREATED_ORDER, links: [{ rel: "payer-action", href: "https://www.paypal.com/checkoutnow" }] },
    ],
    [
      "a look-alike host",
      {
        ...CREATED_ORDER,
        links: [{ rel: "approve", href: "https://www.sandbox.paypal.com.evil.test/checkoutnow" }],
      },
    ],
  ])("%s is unknown", async (_name, body) => {
    expect(await create({ status: 201, body })).toMatchObject({ outcome: "unknown", status: 201 });
  });
});

describe("authorizeOrder", () => {
  const authorize = (step: PayPalStep) =>
    setup([step]).client.authorizeOrder(authorizeOrderRequest(ORDER_ID));

  it("returns the hold", async () => {
    const result = await authorize({ status: 201, body: authorizedOrder() });
    expect(result).toMatchObject({
      outcome: "completed",
      status: 201,
      value: { authorizationId: HOLD_ID, expiresAt: new Date(EXPIRES) },
    });
  });

  it.each(["DENIED", "PENDING"])("%s is a definite failure, not a hold", async (status) => {
    const result = await authorize({ status: 201, body: authorizedOrder(status) });
    expect(result).toMatchObject({ outcome: "failed", issue: `AUTHORIZATION_${status}` });
  });

  it.each<[string, unknown]>([
    ["no authorization", { id: ORDER_ID, status: "COMPLETED", purchase_units: [{}] }],
    ["an order that is not completed", { ...authorizedOrder(), status: "APPROVED" }],
    ["an authorization in a status we do not know", authorizedOrder("CAPTURED")],
    [
      "no expiry",
      {
        id: ORDER_ID,
        status: "COMPLETED",
        purchase_units: [{ payments: { authorizations: [{ id: HOLD_ID, status: "CREATED" }] } }],
      },
    ],
    [
      "an expiry that is not a date",
      {
        id: ORDER_ID,
        status: "COMPLETED",
        purchase_units: [
          { payments: { authorizations: [{ id: HOLD_ID, status: "CREATED", expiration_time: "soon" }] } },
        ],
      },
    ],
  ])("%s is unknown", async (_name, body) => {
    expect(await authorize({ status: 201, body })).toMatchObject({ outcome: "unknown", status: 201 });
  });

  it("names the issue of a refusal, so a replay can be told apart", async () => {
    const result = await authorize({
      status: 422,
      body: refusal("UNPROCESSABLE_ENTITY", "ORDER_ALREADY_AUTHORIZED"),
    });
    expect(result).toMatchObject({
      outcome: "failed",
      status: 422,
      debugId: "debug-1",
      name: "UNPROCESSABLE_ENTITY",
      issue: "ORDER_ALREADY_AUTHORIZED",
    });
  });
});

describe("classification", () => {
  const authorize = (step: PayPalStep) =>
    setup([step]).client.authorizeOrder(authorizeOrderRequest(ORDER_ID));

  it.each<[string, PayPalStep]>([
    ["a 500", { status: 500, body: { name: "INTERNAL_SERVER_ERROR" } }],
    ["a 503 without JSON", { status: 503, text: "<html>" }],
    ["a 4xx that is not JSON", { status: 400, text: "Bad gateway" }],
    ["a 2xx that is not JSON", { status: 201, text: "" }],
    ["a JSON array", { status: 201, text: "[]" }],
    ["a redirect", { status: 302, body: {} }],
    ["a 2xx we did not expect", { status: 202, body: authorizedOrder() }],
    [
      "a request still running",
      { status: 409, body: refusal("RESOURCE_CONFLICT", "PREVIOUS_REQUEST_IN_PROGRESS") },
    ],
  ])("%s is unknown", async (_name, step) => {
    expect(await authorize(step)).toMatchObject({
      outcome: "unknown",
      status: step.status,
      debugId: "debug-1",
    });
  });

  it("a request still running is unknown under any error name", async () => {
    const step = { status: 422, body: refusal("UNPROCESSABLE_ENTITY", "PREVIOUS_REQUEST_IN_PROGRESS") };
    expect(await authorize(step)).toMatchObject({ outcome: "unknown", status: 422 });
  });

  it("a timeout is unknown, with no status", async () => {
    expect(await authorize({ fail: "timeout" })).toEqual({
      outcome: "unknown",
      status: null,
      debugId: null,
      response: { error: "TimeoutError" },
    });
  });

  it("a network error is unknown", async () => {
    expect(await authorize({ fail: "network" })).toMatchObject({ outcome: "unknown", status: null });
  });

  it("a reply that breaks mid-body is unknown, and keeps what arrived", async () => {
    expect(await authorize({ status: 201, breaksInBody: true })).toMatchObject({
      outcome: "unknown",
      status: 201,
      debugId: "debug-1",
    });
  });

  it("a 4xx with no details still fails, with no issue", async () => {
    expect(await authorize({ status: 404, body: { name: "RESOURCE_NOT_FOUND" } })).toMatchObject({
      outcome: "failed",
      name: "RESOURCE_NOT_FOUND",
      issue: null,
    });
  });
});

describe("stored response", () => {
  it("has no buyer details and keeps the ids", async () => {
    const { client } = setup([{ status: 201, body: authorizedOrder() }]);
    const { response } = await client.authorizeOrder(authorizeOrderRequest(ORDER_ID));
    const text = JSON.stringify(response);
    for (const secret of ["buyer@example.com", "Maya", "Shah", "1 Main St"])
      expect(text).not.toContain(secret);
    expect(text).toContain(HOLD_ID);
  });

  it("keeps the issue when a huge refusal is cut down", async () => {
    const body = { ...refusal("UNPROCESSABLE_ENTITY", "ORDER_NOT_APPROVED"), padding: "x".repeat(9000) };
    const { client } = setup([{ status: 422, body }]);
    const result = await client.authorizeOrder(authorizeOrderRequest(ORDER_ID));
    expect(result.response).toMatchObject({ name: "UNPROCESSABLE_ENTITY", issue: "ORDER_NOT_APPROVED" });
  });

  it("is cut down to its identifiers when huge", async () => {
    const { client } = setup([{ status: 201, body: { ...CREATED_ORDER, padding: "x".repeat(9000) } }]);
    const result = await client.createOrder(createOrderRequest(testEnv(), INPUT));
    expect(result.response).toMatchObject({ truncated: true, id: ORDER_ID, status: "PAYER_ACTION_REQUIRED" });
    expect(result.outcome).toBe("completed");
  });
});

describe("reads", () => {
  it("getOrder reports the status and the authorization", async () => {
    const { client } = setup([{ body: authorizedOrder() }]);
    expect(await client.getOrder(getOrderRequest(ORDER_ID))).toMatchObject({
      outcome: "completed",
      value: {
        status: "COMPLETED",
        authorization: { id: HOLD_ID, status: "CREATED", expiresAt: new Date(EXPIRES) },
      },
    });
  });

  it("getOrder reports no authorization on an order not yet approved", async () => {
    const { client } = setup([{ body: { id: ORDER_ID, status: "PAYER_ACTION_REQUIRED" } }]);
    expect(await client.getOrder(getOrderRequest(ORDER_ID))).toMatchObject({
      outcome: "completed",
      value: { status: "PAYER_ACTION_REQUIRED", authorization: null },
    });
  });

  it("getAuthorization reports the status", async () => {
    const { client, paypal } = setup([{ body: { id: HOLD_ID, status: "VOIDED" } }]);
    expect(await client.getAuthorization(getAuthorizationRequest(HOLD_ID))).toMatchObject({
      outcome: "completed",
      value: { id: HOLD_ID, status: "VOIDED", expiresAt: null },
    });
    expect(paypal.apiCalls()[0]?.url).toContain(`/v2/payments/authorizations/${HOLD_ID}`);
  });
});

describe("closed", () => {
  it("the kill switch stops writes before any call, and reads still run", async () => {
    const { client, env, paypal } = setup([{ body: authorizedOrder() }], {
      env: { PAYPAL_WRITES_ENABLED: "false" },
    });
    expect(paypalWritesOpen(env)).toBe(false);
    const result = await client.createOrder(createOrderRequest(env, INPUT));
    expect(result).toMatchObject({ outcome: "failed", status: null, name: "paypal_disabled" });
    expect(paypal.calls).toHaveLength(0);
    expect(await client.getOrder(getOrderRequest(ORDER_ID))).toMatchObject({ outcome: "completed" });
  });

  it.each(["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"])("without %s no call is made at all", async (key) => {
    const { client, env, paypal } = setup([], { env: { [key]: undefined } });
    expect(paypalWritesOpen(env)).toBe(false);
    const result = await client.getOrder(getOrderRequest(ORDER_ID));
    expect(result).toMatchObject({ outcome: "failed", name: "paypal_not_configured" });
    expect(paypal.calls).toHaveLength(0);
  });

  it("is open with keys and the switch on", () => {
    expect(paypalWritesOpen(setup([]).env)).toBe(true);
  });
});
