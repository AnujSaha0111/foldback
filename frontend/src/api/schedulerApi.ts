import type { SchedulerProjection } from "@/types/generated/api-types";
import { baseApi } from "./baseApi";

const schedulerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** The board's data. The server works out every bar; the client only draws it (docs/spec/scheduler.md). */
    getScheduler: build.query<SchedulerProjection, string>({
      query: (id) => `/api/contracts/${encodeURIComponent(id)}/scheduler`,
      providesTags: (_result, _error, id) => [{ type: "Scheduler", id }],
    }),
  }),
});

export const { useGetSchedulerQuery } = schedulerApi;
