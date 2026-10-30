import type { HealthSummary } from "@/types/generated/api-types";
import { baseApi } from "./baseApi";

const healthApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getHealth: build.query<HealthSummary, void>({ query: () => "/api/health" }),
  }),
});

export const { useGetHealthQuery } = healthApi;
