/** Every error code the API can return, with its HTTP status. Mirrors the table in docs/spec/api.md. */
const ERROR_STATUS = {
  bad_request: 400,
  unauthenticated: 401,
  invalid_credentials: 401,
  bad_origin: 403,
  signups_disabled: 403,
  not_found: 404,
  email_taken: 409,
  resolve_in_progress: 409,
  live_money: 409,
  sample_row: 409,
  share_already_held: 409,
  share_not_payable: 409,
  contract_closed: 409,
  money_unknown: 409,
  capture_refused: 409,
  not_confirmed: 409,
  bad_clock: 409,
  needs_clarification: 422,
  confirm_mismatch: 422,
  payload_too_large: 413,
  rate_limited: 429,
  demo_full: 429,
  paypal_failed: 502,
  agent_unavailable: 503,
  ai_budget_exhausted: 503,
  paypal_disabled: 503,
  unavailable: 503,
  internal: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

/** A failure the client is allowed to see. Anything else becomes a plain 500 `internal`. */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: unknown;
  readonly headers: Record<string, string>;

  constructor(code: ErrorCode, message: string, details?: unknown, headers: Record<string, string> = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = details;
    this.headers = headers;
  }
}
