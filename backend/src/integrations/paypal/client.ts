import { z } from "zod";
import type { Env } from "../../config/env";
import type { Logger } from "../../observability/logger";
import { authorizeKey, captureKey, orderKey, voidKey } from "./keys";

// The only file that makes PayPal HTTP calls (docs/spec/paypal.md). Plain fetch, sandbox only: env.ts refuses any other
// base URL. It never touches the database. Callers record each call in paypal_operations, outside any transaction.

/** `shares.approve_url` has a CHECK on this prefix, so a link anywhere else must never reach an insert. */
const APPROVE_URL_PREFIX = "https://www.sandbox.paypal.com/";

/** A token is dropped this long before it expires, so a call never leaves with one about to lapse. */
const TOKEN_MARGIN_MS = 60_000;

/** PayPal's limit on `description`. A long title and name together would otherwise get the order refused. */
const MAX_DESCRIPTION = 127;

/** Bigger bodies keep only their identifiers. The operation row is an audit record, not an archive. */
const MAX_STORED_RESPONSE = 8_000;

/** A write always carries its idempotency key, so the compiler refuses one that would leave without it. */
export type PayPalRequest =
  | { method: "POST"; path: string; key: string; body: unknown }
  | { method: "GET"; path: string; key: null; body: null };

interface Reply {
  /** Null when no HTTP status was received. */
  status: number | null;
  debugId: string | null;
  /** Safe to store: the payer's details are removed. */
  response: unknown;
}

/** Every call ends as one of these, and none of them throws (docs/spec/paypal.md, "Common request rules"). */
export type PayPalResult<T> =
  | (Reply & { outcome: "completed"; value: T })
  | (Reply & { outcome: "failed"; name: string | null; issue: string | null })
  | (Reply & { outcome: "unknown" });

export interface PayPalDeps {
  env: Env;
  logger: Logger;
  fetch?: typeof fetch;
}

export interface OrderInput {
  shareId: string;
  checkoutAttempt: number;
  amountCents: number;
  title: string;
  displayName: string;
}

/** The only place cents become PayPal's decimal string. Integer math, so no value ever picks up a float error. */
function moneyValue(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/** Cuts text to PayPal's limit without leaving half of a surrogate pair, which PayPal would refuse. */
function fitDescription(text: string): string {
  return text.slice(0, MAX_DESCRIPTION).replace(/[\uD800-\uDBFF]$/, "");
}

export function createOrderRequest(env: Env, input: OrderInput): PayPalRequest {
  const { shareId, checkoutAttempt } = input;
  const returnUrl = new URL(`/pay/${shareId}`, env.APP_BASE_URL).href;
  return {
    method: "POST",
    path: "/v2/checkout/orders",
    key: orderKey(shareId, checkoutAttempt),
    body: {
      intent: "AUTHORIZE",
      purchase_units: [
        {
          reference_id: shareId,
          custom_id: shareId,
          invoice_id: `foldback-${shareId}-${checkoutAttempt}`,
          description: fitDescription(`Foldback hold: ${input.title} share for ${input.displayName}`),
          amount: { currency_code: "USD", value: moneyValue(input.amountCents) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Foldback",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: returnUrl,
            cancel_url: `${returnUrl}?cancelled=1`,
          },
        },
      },
    },
  };
}

export function authorizeOrderRequest(orderId: string): PayPalRequest {
  return {
    method: "POST",
    path: `/v2/checkout/orders/${encodeURIComponent(orderId)}/authorize`,
    key: authorizeKey(orderId),
    body: {},
  };
}

export interface CaptureInput {
  authorizationId: string;
  shareId: string;
  amountCents: number;
}

/** `final_capture` closes the authorization, so nothing more can ever be taken from it. */
export function captureAuthorizationRequest(input: CaptureInput): PayPalRequest {
  return {
    method: "POST",
    path: `/v2/payments/authorizations/${encodeURIComponent(input.authorizationId)}/capture`,
    key: captureKey(input.authorizationId),
    body: {
      amount: { currency_code: "USD", value: moneyValue(input.amountCents) },
      final_capture: true,
      invoice_id: `foldback-capture-${input.shareId}`,
      note_to_payer: "Everyone paid by the deadline, so Foldback captured your share.",
    },
  };
}

export function voidAuthorizationRequest(authorizationId: string): PayPalRequest {
  return {
    method: "POST",
    path: `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/void`,
    key: voidKey(authorizationId),
    body: {},
  };
}

export function getOrderRequest(orderId: string): PayPalRequest {
  return {
    method: "GET",
    path: `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    key: null,
    body: null,
  };
}

export function getAuthorizationRequest(authorizationId: string): PayPalRequest {
  return {
    method: "GET",
    path: `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}`,
    key: null,
    body: null,
  };
}

/** True when checkout and authorize may run: the kill switch is on and the sandbox keys are set. */
export function paypalWritesOpen(env: Env): boolean {
  return env.PAYPAL_WRITES_ENABLED && hasKeys(env);
}

function hasKeys(env: Env): boolean {
  return env.PAYPAL_CLIENT_ID !== undefined && env.PAYPAL_CLIENT_SECRET !== undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function without(value: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

/**
 * What may be stored. Settled operation rows are frozen, so anything kept here stays for good (data model F18).
 * `payer` and `payment_source` both carry the buyer's name and email, and `shipping` their address.
 */
function storable(body: Record<string, unknown>): unknown {
  const kept = without(body, ["payer", "payment_source"]);
  const units = kept["purchase_units"];
  if (Array.isArray(units)) {
    kept["purchase_units"] = units.map((unit: unknown) =>
      isRecord(unit) ? without(unit, ["shipping"]) : unit,
    );
  }
  if (JSON.stringify(kept).length <= MAX_STORED_RESPONSE) return kept;
  return {
    truncated: true,
    id: kept["id"],
    status: kept["status"],
    name: kept["name"],
    issue: firstIssue(kept),
  };
}

function parseObject(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function firstIssue(body: Record<string, unknown>): string | null {
  const details = body["details"];
  const first: unknown = Array.isArray(details) ? details[0] : undefined;
  const issue = isRecord(first) ? first["issue"] : undefined;
  return typeof issue === "string" ? issue : null;
}

/**
 * Sorts one HTTP reply. A 4xx with a JSON body is a definite failure, with one exception: an earlier request with this
 * key is still running, so PayPal has not said how it ended. The issue is checked as well as the name, because that
 * is the part that states it.
 */
function classify(status: number, debugId: string | null, text: string): PayPalResult<unknown> {
  // A void answers 204 with no body. That is its success, not an unreadable reply.
  if (status === 204 && text === "")
    return { status, debugId, response: {}, outcome: "completed", value: {} };
  const body = parseObject(text);
  const reply: Reply = {
    status,
    debugId,
    response: body === null ? { error: "unparseable body" } : storable(body),
  };
  if (body === null) return { ...reply, outcome: "unknown" };
  if (status === 200 || status === 201) return { ...reply, outcome: "completed", value: body };
  const issue = firstIssue(body);
  const stillRunning = body["name"] === "RESOURCE_CONFLICT" || issue === "PREVIOUS_REQUEST_IN_PROGRESS";
  if (status < 400 || status >= 500 || stillRunning) return { ...reply, outcome: "unknown" };
  const name = typeof body["name"] === "string" ? body["name"] : null;
  return { ...reply, outcome: "failed", name, issue };
}

/** Nothing reached PayPal, so this is a definite failure however it came about. */
function notSent(name: string): PayPalResult<never> {
  return { outcome: "failed", status: null, debugId: null, response: { error: name }, name, issue: null };
}

/** What a completed reply turned out to mean: a value, a refusal in a 2xx body, or (null) nothing we can rely on. */
type Reading<U> = { value: U } | { issue: string } | null;

/** Narrows a completed reply. A 2xx whose body is not what the spec promises is unknown, never a success. */
function read<T, U>(
  reply: PayPalResult<unknown>,
  schema: z.ZodType<T>,
  interpret: (body: T) => Reading<U>,
): PayPalResult<U> {
  if (reply.outcome !== "completed") return reply;
  const { status, debugId, response } = reply;
  const parsed = schema.safeParse(reply.value);
  const reading = parsed.success ? interpret(parsed.data) : null;
  if (reading === null) return { status, debugId, response, outcome: "unknown" };
  if ("issue" in reading) {
    return { status, debugId, response, outcome: "failed", name: null, issue: reading.issue };
  }
  return { status, debugId, response, outcome: "completed", value: reading.value };
}

const tokenReply = z.object({ access_token: z.string().min(1), expires_in: z.number().positive() });

const createdOrder = z.object({
  id: z.string().min(1),
  status: z.enum(["PAYER_ACTION_REQUIRED", "CREATED"]),
  links: z.array(z.object({ rel: z.string(), href: z.string() })),
});

const authorization = z.object({
  id: z.string().min(1),
  status: z.string(),
  expiration_time: z.iso.datetime({ offset: true }).optional(),
});

const order = z.object({
  id: z.string().min(1),
  status: z.string(),
  purchase_units: z
    .array(
      z.object({
        payments: z
          .object({
            authorizations: z.array(authorization).optional(),
            captures: z.array(z.object({ id: z.string().min(1), status: z.string() })).optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

type OrderBody = z.infer<typeof order>;
type AuthorizationBody = z.infer<typeof authorization>;

function firstAuthorization(body: OrderBody): AuthorizationBody | null {
  return body.purchase_units?.[0]?.payments?.authorizations?.[0] ?? null;
}

function expiry(body: AuthorizationBody): Date | null {
  return body.expiration_time === undefined ? null : new Date(body.expiration_time);
}

interface PlacedHold {
  authorizationId: string;
  expiresAt: Date;
}

interface AuthorizationFact {
  id: string;
  status: string;
  expiresAt: Date | null;
}

function fact(body: AuthorizationBody): AuthorizationFact {
  return { id: body.id, status: body.status, expiresAt: expiry(body) };
}

/** Success needs an id and a sandbox approval link. Without them nothing can follow, so the outcome is unknown. */
function newOrder(body: z.infer<typeof createdOrder>): Reading<{ orderId: string; approveUrl: string }> {
  const link = body.links.find((item) => item.rel === "payer-action" || item.rel === "approve");
  if (link === undefined || !link.href.startsWith(APPROVE_URL_PREFIX)) return null;
  return { value: { orderId: body.id, approveUrl: link.href } };
}

/** A hold is only a hold when the authorization says CREATED. DENIED and PENDING are refusals (paypal.md). */
function placedHold(body: OrderBody): Reading<PlacedHold> {
  const placed = firstAuthorization(body);
  if (placed === null) return null;
  if (placed.status === "DENIED" || placed.status === "PENDING") {
    return { issue: `AUTHORIZATION_${placed.status}` };
  }
  const expiresAt = expiry(placed);
  if (body.status !== "COMPLETED" || placed.status !== "CREATED" || expiresAt === null) return null;
  return { value: { authorizationId: placed.id, expiresAt } };
}

interface OrderFact {
  status: string;
  authorization: AuthorizationFact | null;
  /** The order's capture. Each order has one authorization, so a capture here is that authorization's. */
  capture: { id: string; status: string } | null;
}

function orderFact(body: OrderBody): Reading<OrderFact> {
  const found = firstAuthorization(body);
  const capture = body.purchase_units?.[0]?.payments?.captures?.[0] ?? null;
  return { value: { status: body.status, authorization: found === null ? null : fact(found), capture } };
}

const captured = z.object({ id: z.string().min(1), status: z.string() });

/** PENDING still means PayPal took the capture (paypal.md), so both count as kept. */
function newCapture(body: z.infer<typeof captured>): Reading<{ captureId: string }> {
  return body.status === "COMPLETED" || body.status === "PENDING" ? { value: { captureId: body.id } } : null;
}

const voided = z.object({ status: z.string().optional() });

/** 204 has no body, and a body that says anything but VOIDED is not a release we can rely on. */
function released(body: z.infer<typeof voided>): Reading<true> {
  return body.status === undefined || body.status === "VOIDED" ? { value: true } : null;
}

/** Read by name, because the timeout's DOMException is not always an `Error` under test runners. */
function errorName(error: unknown): string {
  const name = typeof error === "object" && error !== null ? (error as { name?: unknown }).name : undefined;
  return typeof name === "string" ? name : "error";
}

interface Transport {
  env: Env;
  log: Logger;
  doFetch: typeof fetch;
}

/** Holds the OAuth token. `get` gives null when PayPal gave none, and failures log the reason, never the secret. */
function createTokenCache({ env, log, doFetch }: Transport) {
  let token: { value: string; until: number } | null = null;

  async function fetchToken(): Promise<string | null> {
    const credentials = `${env.PAYPAL_CLIENT_ID ?? ""}:${env.PAYPAL_CLIENT_SECRET ?? ""}`;
    try {
      const response = await doFetch(`${env.PAYPAL_API_BASE}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(credentials).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
        signal: AbortSignal.timeout(env.PAYPAL_TIMEOUT_MS),
      });
      const parsed = tokenReply.safeParse(parseObject(await response.text()));
      if (!response.ok || !parsed.success) {
        log.warn("no token", { status: response.status });
        return null;
      }
      const lifetimeMs = parsed.data.expires_in * 1000;
      token = { value: parsed.data.access_token, until: Date.now() + lifetimeMs - TOKEN_MARGIN_MS };
      return token.value;
    } catch (error) {
      log.warn("no token", { error: errorName(error) });
      return null;
    }
  }

  return {
    get: (): Promise<string | null> =>
      token !== null && Date.now() < token.until ? Promise.resolve(token.value) : fetchToken(),
    drop: (): void => {
      token = null;
    },
  };
}

function httpInit(request: PayPalRequest, bearer: string, timeoutMs: number): RequestInit {
  const init = {
    method: request.method,
    headers: { Authorization: `Bearer ${bearer}` },
    // A write must never be re-sent somewhere else. A 3xx comes back as itself, and classifies as unknown.
    redirect: "manual" as const,
    signal: AbortSignal.timeout(timeoutMs),
  };
  if (request.method === "GET") return init;
  return {
    ...init,
    headers: {
      ...init.headers,
      "Content-Type": "application/json",
      "PayPal-Request-Id": request.key,
      Prefer: "return=representation",
    },
    body: JSON.stringify(request.body),
  };
}

export type PayPalClient = ReturnType<typeof createPayPalClient>;

/** One per process, because it holds the cached OAuth token. */
export function createPayPalClient(deps: PayPalDeps) {
  const { env } = deps;
  const transport = { env, log: deps.logger.child({ module: "paypal" }), doFetch: deps.fetch ?? fetch };
  const { log, doFetch } = transport;
  const tokens = createTokenCache(transport);

  async function send(request: PayPalRequest): Promise<PayPalResult<unknown>> {
    if (!hasKeys(env)) return notSent("paypal_not_configured");
    if (request.method === "POST" && !env.PAYPAL_WRITES_ENABLED) return notSent("paypal_disabled");
    const bearer = await tokens.get();
    if (bearer === null) return notSent("paypal_token_unavailable");

    const started = Date.now();
    // Kept outside the try: a reply can arrive and then fail while its body is read, and these still matter then.
    let status: number | null = null;
    let debugId: string | null = null;
    try {
      const init = httpInit(request, bearer, env.PAYPAL_TIMEOUT_MS);
      const response = await doFetch(`${env.PAYPAL_API_BASE}${request.path}`, init);
      status = response.status;
      debugId = response.headers.get("paypal-debug-id");
      if (status === 401) tokens.drop();
      const result = classify(status, debugId, await response.text());
      log.info("call", {
        path: request.path,
        status,
        debugId,
        outcome: result.outcome,
        ms: Date.now() - started,
      });
      return result;
    } catch (error) {
      const name = errorName(error);
      log.warn("call failed", { path: request.path, status, debugId, error: name, ms: Date.now() - started });
      return { outcome: "unknown", status, debugId, response: { error: name } };
    }
  }

  return {
    createOrder: async (request: PayPalRequest) => read(await send(request), createdOrder, newOrder),
    authorizeOrder: async (request: PayPalRequest) => read(await send(request), order, placedHold),
    captureAuthorization: async (request: PayPalRequest) => read(await send(request), captured, newCapture),
    voidAuthorization: async (request: PayPalRequest) => read(await send(request), voided, released),
    getOrder: async (request: PayPalRequest) => read(await send(request), order, orderFact),
    getAuthorization: async (request: PayPalRequest) =>
      read(await send(request), authorization, (body) => ({ value: fact(body) })),
  };
}
