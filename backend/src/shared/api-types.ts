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
  demo_now: string | null;
  resolution_reason: string | null;
}

export interface ApiContract extends ContractSummary {
  direction: Direction | null;
  currency: string | null;
  total_cents: number | null;
  timezone: string | null;
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
