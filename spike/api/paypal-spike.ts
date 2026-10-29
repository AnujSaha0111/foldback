// Phase 0 spike: prove sandbox AUTHORIZE -> capture and AUTHORIZE -> void with real ids.
// Usage:
//   yarn spike:paypal                       both paths (asks you to approve two orders)
//   yarn spike:paypal keep                  keep path only
//   yarn spike:paypal release               release path only
//   yarn spike:paypal keep <ORDER_ID>       resume the keep path with an order you already approved
//   yarn spike:paypal release <ORDER_ID>    resume the release path with an order you already approved
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const { PAYPAL_ENV, PAYPAL_API_BASE, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;

if (PAYPAL_ENV !== "sandbox") throw new Error("PAYPAL_ENV must be exactly 'sandbox'.");
if (PAYPAL_API_BASE !== "https://api-m.sandbox.paypal.com") {
  throw new Error("PAYPAL_API_BASE must be https://api-m.sandbox.paypal.com.");
}
if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  throw new Error("Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in spike/api/.env.");
}

const stamp = Date.now();
const rl = createInterface({ input: stdin, output: stdout });

interface PayPalResult {
  status: number;
  body: any;
  debugId: string | null;
}

async function getToken(): Promise<string> {
  const basic = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json()) as { access_token?: string };
  if (!res.ok || !json.access_token) throw new Error(`OAuth failed with HTTP ${res.status}.`);
  return json.access_token; // never printed
}

const token = await getToken();

async function paypal(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<PayPalResult> {
  const res = await fetch(`${PAYPAL_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(idempotencyKey ? { "PayPal-Request-Id": idempotencyKey } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text.slice(0, 300) };
  }
  const debugId = res.headers.get("paypal-debug-id");
  console.log(`  ${method} ${path} -> HTTP ${res.status}  paypal-debug-id=${debugId ?? "none"}`);
  if (res.status >= 400) console.log("  error:", JSON.stringify(parsed).slice(0, 500));
  return { status: res.status, body: parsed, debugId };
}

// Accepts a bare token, "TOKEN&PayerID=...", or the whole return URL, and returns just the order id.
function extractOrderId(input: string): string {
  const fromUrl = input.match(/[?&]token=([A-Za-z0-9]+)/);
  if (fromUrl?.[1]) return fromUrl[1];
  return input.trim().split(/[&?\s]/)[0] ?? "";
}

async function createAndApprove(label: string): Promise<string> {
  console.log(`\n=== ${label}: create AUTHORIZE order ===`);
  const created = await paypal(
    "POST",
    "/v2/checkout/orders",
    {
      intent: "AUTHORIZE",
      purchase_units: [
        {
          reference_id: `spike-${label}`,
          custom_id: `spike-${label}`,
          invoice_id: `foldback-spike-${label}-${stamp}`,
          description: "Foldback spike hold",
          amount: { currency_code: "USD", value: "80.00" },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Foldback",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: "http://localhost:3000/spike-return",
            cancel_url: "http://localhost:3000/spike-return?cancelled=1",
          },
        },
      },
    },
    `spike-order-${label}-${stamp}`,
  );
  if (created.status >= 300) throw new Error("create order failed");
  const orderId: string = created.body.id;
  const link = (created.body.links as { rel: string; href: string }[]).find(
    (l) => l.rel === "payer-action" || l.rel === "approve",
  );
  console.log(`  order id: ${orderId}  status: ${created.body.status}`);
  console.log(`\n  Open this link, log in as the SANDBOX PERSONAL (buyer) account, and approve:\n  ${link?.href}\n`);
  console.log("  After approving, the browser lands on localhost:3000 and may show 'cannot connect'. That is fine.");
  console.log("  Paste the whole address-bar URL (or just the token). Press Enter alone to reuse the order id above.");
  const pasted = (await rl.question("  Paste here: ")).trim();
  return pasted ? extractOrderId(pasted) : orderId;
}

async function authorize(label: string, orderId: string): Promise<string> {
  console.log(`\n=== ${label}: authorize order ${orderId} ===`);
  const auth = await paypal("POST", `/v2/checkout/orders/${orderId}/authorize`, {}, `spike-auth-${orderId}`);
  if (auth.status >= 300) throw new Error("authorize failed");
  const authorization = auth.body.purchase_units?.[0]?.payments?.authorizations?.[0];
  console.log(`  AUTHORIZATION ID: ${authorization?.id}`);
  console.log(`  status: ${authorization?.status}   expires: ${authorization?.expiration_time}`);
  if (!authorization?.id || authorization.status !== "CREATED") throw new Error("no CREATED authorization");
  return authorization.id as string;
}

async function keepPath(resumeOrderId?: string): Promise<void> {
  const orderId = resumeOrderId ?? (await createAndApprove("keep"));
  const authId = await authorize("keep", orderId);
  console.log("\n=== keep: capture ===");
  const cap = await paypal(
    "POST",
    `/v2/payments/authorizations/${authId}/capture`,
    {
      amount: { currency_code: "USD", value: "80.00" },
      final_capture: true,
      invoice_id: `foldback-capture-spike-${stamp}`,
      note_to_payer: "Spike capture.",
    },
    `spike-capture-${authId}`,
  );
  console.log(`  CAPTURE ID: ${cap.body?.id}   status: ${cap.body?.status}`);
}

async function releasePath(resumeOrderId?: string): Promise<void> {
  const orderId = resumeOrderId ?? (await createAndApprove("release"));
  const authId = await authorize("release", orderId);
  console.log("\n=== release: void ===");
  const voided = await paypal("POST", `/v2/payments/authorizations/${authId}/void`, undefined, `spike-void-${authId}`);
  console.log(`  void HTTP status: ${voided.status} (expect 204)`);
  const check = await paypal("GET", `/v2/payments/authorizations/${authId}`);
  console.log(`  GET authorization status: ${check.body?.status} (expect VOIDED)`);
}

const mode = process.argv[2] ?? "both";
const resume = process.argv[3] ? extractOrderId(process.argv[3]) : undefined;
try {
  if (mode === "keep" || mode === "both") await keepPath(mode === "keep" ? resume : undefined);
  if (mode === "release" || mode === "both") await releasePath(mode === "release" ? resume : undefined);
  console.log("\nDone. Copy the ids above into docs/spec/phases/00-spike.md (exit note). Do not paste any token.");
} finally {
  rl.close();
}
