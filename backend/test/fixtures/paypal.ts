/** Stand-in sandbox keys. Without keys the client makes no call at all. */
export const PAYPAL_KEYS = { PAYPAL_CLIENT_ID: "client-id", PAYPAL_CLIENT_SECRET: "client-secret-value" };

/** A share id in the format the database expects. */
export const SHARE_ID = "shr_aaaaaaaaaaaaaaaaaaaaaa";
export const ORDER_ID = "TESTORDER0000001";
export const HOLD_ID = "TESTHOLD00000001";
export const APPROVE_URL = `https://www.sandbox.paypal.com/checkoutnow?token=${ORDER_ID}`;
export const EXPIRES = "2026-12-05T18:00:00Z";

/** Everything a real order body carries about the buyer, none of which may reach an operation row. */
const BUYER = {
  payer: { email_address: "buyer@example.com", name: { given_name: "Maya" } },
  payment_source: { paypal: { email_address: "buyer@example.com", name: { surname: "Shah" } } },
};

export const CREATED_ORDER = {
  id: ORDER_ID,
  status: "PAYER_ACTION_REQUIRED",
  links: [
    { rel: "self", href: `https://api-m.sandbox.paypal.com/v2/checkout/orders/${ORDER_ID}` },
    { rel: "payer-action", href: APPROVE_URL },
  ],
};

export function authorizedOrder(status = "CREATED"): Record<string, unknown> {
  return {
    id: ORDER_ID,
    status: "COMPLETED",
    ...BUYER,
    purchase_units: [
      {
        reference_id: SHARE_ID,
        shipping: { address: { address_line_1: "1 Main St" } },
        payments: { authorizations: [{ id: HOLD_ID, status, expiration_time: EXPIRES }] },
      },
    ],
  };
}

export function refusal(name: string, issue: string): Record<string, unknown> {
  return { name, details: [{ issue, description: "Refused." }], debug_id: "abc123" };
}

export const TOKEN = { access_token: "A21-test-access-token", token_type: "Bearer", expires_in: 32400 };

export interface PayPalStep {
  status?: number;
  body?: unknown;
  /** Sent as is, instead of `body` as JSON. */
  text?: string;
  fail?: "timeout" | "network";
  /** The reply starts, then breaks while its body is read. */
  breaksInBody?: boolean;
  /** Runs while the call is in flight, before the reply arrives. */
  during?: () => Promise<void>;
}

interface PayPalCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
  redirect: RequestRedirect | undefined;
}

function failure(kind: "timeout" | "network"): Error {
  return kind === "timeout"
    ? new DOMException("The operation was aborted", "TimeoutError")
    : new TypeError("fetch failed");
}

function reply(step: PayPalStep): Response {
  const stream = new ReadableStream<Uint8Array>({
    start: (controller) => controller.error(new TypeError("terminated")),
  });
  const payload = step.breaksInBody ? stream : (step.text ?? JSON.stringify(step.body ?? {}));
  return new Response(payload, { status: step.status ?? 200, headers: { "paypal-debug-id": "debug-1" } });
}

/** A fake PayPal: answers token requests by itself, and every other call from the script in order. */
export function scriptedPayPal(steps: PayPalStep[], tokenStep: PayPalStep = { body: TOKEN }) {
  const calls: PayPalCall[] = [];
  const queue = [...steps];
  const stub: typeof fetch = (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    calls.push({
      url,
      method: init?.method ?? "GET",
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: typeof init?.body === "string" ? init.body : undefined,
      redirect: init?.redirect,
    });
    const step = url.endsWith("/v1/oauth2/token") ? tokenStep : queue.shift();
    if (step === undefined) return Promise.reject(new Error(`No scripted PayPal reply for ${url}`));
    return (step.during?.() ?? Promise.resolve()).then(() => {
      if (step.fail) throw failure(step.fail);
      return reply(step);
    });
  };
  return {
    fetch: stub,
    calls,
    /** Calls other than the token fetch. */
    apiCalls: () => calls.filter((call) => !call.url.endsWith("/v1/oauth2/token")),
    tokenCalls: () => calls.filter((call) => call.url.endsWith("/v1/oauth2/token")),
  };
}
