// Types shared with the frontend. `scripts/sync-types.ts` copies this folder into the frontend (sub-phase 3e).

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
