import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { API_URL } from "@/lib/env";

/** What a failed RTK Query request hands back. */
export type ApiFailure = FetchBaseQueryError | { message?: string };

/**
 * The one API client. Every feature adds its endpoints with `injectEndpoints`, and every cache tag is declared
 * here once. Sessions are an httpOnly cookie, so requests always send credentials. No component calls `fetch`.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: API_URL, credentials: "include" }),
  tagTypes: ["Me", "ContractList", "Contract", "Scheduler", "PublicShare"],
  endpoints: () => ({}),
});

interface ApiErrorBody {
  error: string;
  message: string;
}

const isApiErrorBody = (data: unknown): data is ApiErrorBody =>
  typeof data === "object" && data !== null && "message" in data && typeof data.message === "string";

/** The API's `error` code, for the few places that branch on it. Null when the API gave no answer of its own. */
export function errorCode(error: ApiFailure | undefined): string | null {
  return error && "data" in error && isApiErrorBody(error.data) ? error.data.error : null;
}

/** The sentence to show for a failed request: the API's own `message`, or a plain fallback if the API was not reached. */
export function errorMessage(error: ApiFailure | undefined): string {
  if (error && "data" in error && isApiErrorBody(error.data)) return error.data.message;
  return "Foldback could not be reached. Check your connection and try again.";
}
