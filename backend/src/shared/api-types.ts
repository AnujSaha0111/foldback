// Types shared with the frontend. `scripts/sync-types.ts` copies this folder into the frontend (sub-phase 3e).
import type { ContractStatus, Direction, MoneySource, ShareStatus } from "./statuses";

export interface ApiUser {
  id: string;
  kind: "member" | "guest";
  email: string | null;
  display_name: string;
  expires_at: string | null;
}

export interface ApiError {
  error: string;
  message: string;
  request_id?: string;
  details?: unknown;
}

export interface ResetResponse {
  ok: true;
  warning: string;
  contracts: string[];
}

export interface ContractSummary {
  id: string;
  seed_key: string | null;
  title: string | null;
  status: ContractStatus;
  money_source: MoneySource;
  headcount: number | null;
  held_count: number;
  kept_count: number;
  released_count: number;
  share_cents: number | null;
  deadline_at: string | null;
  timezone: string | null;
  demo_now: string | null;
  resolution_reason: string | null;
}

export interface ApiContract extends ContractSummary {
  direction: Direction | null;
  currency: string | null;
  total_cents: number | null;
  grace_person_name: string | null;
  grace_until: string | null;
  clarification_question: string | null;
  extraction: unknown;
}

export interface ApiShare {
  id: string;
  display_name: string;
  is_grace_subject: boolean;
  status: ShareStatus;
  amount_cents: number;
  money_source: MoneySource;
  sample_label: string | null;
  order_id: string | null;
  authorization_id: string | null;
  authorization_expires_at: string | null;
  capture_id: string | null;
  payable: boolean;
  pay_path: string;
}

export interface ApiEvent {
  type: string;
  detail: string;
  created_at: string;
  share_id: string | null;
}

export interface ContractRead {
  contract: ApiContract;
  shares: ApiShare[];
  events: ApiEvent[];
}

/** GET /api/shares/:shareId. Only what the payer needs: no PayPal ids, and nobody else's status beyond the count. */
export interface PublicShare {
  share_id: string;
  contract_id: string;
  display_name: string;
  title: string;
  amount_cents: number;
  currency: string;
  headcount: number;
  held_count: number;
  deadline_at: string;
  grace_until: string | null;
  is_grace_subject: boolean;
  timezone: string;
  demo_now: string;
  status: ShareStatus;
  contract_status: ContractStatus;
  money_source: MoneySource;
  payable: boolean;
  other_names: string[];
}

/** Colors the board gives a bar. The word on the bar, never the color, says the status. */
export type SchedulerColor = "gray" | "blue" | "green" | "red";

export interface SchedulerResource {
  id: string;
  name: string;
  badge: "Sample" | "Sandbox";
}

export interface SchedulerEvent {
  id: string;
  resourceId: string;
  name: string;
  status: ShareStatus;
  startDate: string;
  endDate: string;
  eventColor: SchedulerColor;
  cls: string | null;
  moneySource: MoneySource;
  paypalId: string | null;
}

export interface SchedulerTimeRange {
  id: "deadline" | "grace" | "now";
  name: string;
  startDate: string;
  cls: string;
}

/** GET /api/contracts/:id/scheduler. The board draws exactly this and works out nothing itself. */
export interface SchedulerProjection {
  timezone: string;
  start: string;
  end: string;
  resources: SchedulerResource[];
  events: SchedulerEvent[];
  timeRanges: SchedulerTimeRange[];
}

/** Socket.IO messages. They carry ids only; the REST read model is the single source of truth. */
export interface ContractChangedEvent {
  contractId: string;
  version: number;
}

export interface ShareChangedEvent {
  shareId: string;
  contractId: string;
}

export type JoinAck = { ok: true } | { ok: false; error: "unauthenticated" | "not_found" | "bad_request" };

/** One reading of a pasted chat. Every value is checked by the server before it is stored (docs/spec/ai.md). */
export interface ApiExtraction {
  title: string | null;
  currency: "USD" | null;
  total_cents: number | null;
  share_cents: number | null;
  headcount: number | null;
  deadline_at: string | null;
  timezone: string | null;
  grace_person_name: string | null;
  grace_until: string | null;
  people: string[];
  missing: string[];
  clarification_question: string | null;
  evidence: { field: string; quote: string }[];
}

/** POST /api/contracts and /clarify when the reading is complete. */
export interface RuleResult {
  contract_id: string;
  extraction: ApiExtraction;
}

/** The 422 body of the same routes when the reading needs an answer. */
export interface RuleClarification extends ApiError {
  contract_id: string;
  missing: string[];
  extraction: ApiExtraction | null;
}

/** POST /api/contracts/:id/confirm. The terms exactly as they were read: the server compares every field. */
export interface ConfirmTerms {
  title: string;
  currency: string;
  total_cents: number;
  share_cents: number;
  headcount: number;
  deadline_at: string;
  timezone: string;
  grace_person_name: string | null;
  grace_until: string | null;
  people: string[];
}

/** GET /api/health. Public, and safe to show: it holds no secret. */
export interface HealthSummary {
  ok: true;
  service: "foldback";
  version: string;
  paypal_env: "sandbox";
  llm: boolean;
  ai_calls_left: number;
}
