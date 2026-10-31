import type { PublicShare } from "@/types/generated/api-types";
import { baseApi } from "./baseApi";

const sharesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** The pay link's page. Public: holding the link is the permission (docs/spec/api.md, Public share). */
    getShare: build.query<PublicShare, string>({
      query: (id) => `/api/shares/${encodeURIComponent(id)}`,
      providesTags: (_result, _error, id) => [{ type: "PublicShare", id }],
    }),
  }),
});

export const { useGetShareQuery } = sharesApi;
