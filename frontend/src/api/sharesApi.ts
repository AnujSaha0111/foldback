import type {
  AuthorizeResponse,
  CheckoutResponse,
  PublicShare,
  ShareReply,
} from "@/types/generated/api-types";
import { baseApi } from "./baseApi";

const sharesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** The pay link's page. Public: holding the link is the permission (docs/spec/api.md, Public share). */
    getShare: build.query<PublicShare, string>({
      query: (id) => `/api/shares/${encodeURIComponent(id)}`,
      providesTags: (_result, _error, id) => [{ type: "PublicShare", id }],
    }),
    /** Opens PayPal for this share, or returns the checkout already open. The server decides the amount. */
    checkout: build.mutation<CheckoutResponse, string>({
      query: (id) => ({ url: `/api/shares/${encodeURIComponent(id)}/checkout`, method: "POST", body: {} }),
      invalidatesTags: (_result, _error, id) => [{ type: "PublicShare", id }],
    }),
    /** Places the hold after PayPal sent the friend back. `orderId` is the `token` from the return URL. */
    authorize: build.mutation<AuthorizeResponse, { shareId: string; orderId: string }>({
      query: ({ shareId, orderId }) => ({
        url: `/api/shares/${encodeURIComponent(shareId)}/authorize`,
        method: "POST",
        body: { order_id: orderId },
      }),
    }),
    /** Settles an unclear PayPal result for this share, or closes a checkout the friend cancelled at PayPal. */
    sync: build.mutation<ShareReply, { shareId: string; buyerCancelled?: boolean }>({
      query: ({ shareId, buyerCancelled }) => ({
        url: `/api/shares/${encodeURIComponent(shareId)}/sync`,
        method: "POST",
        body: buyerCancelled ? { buyer_cancelled: true } : {},
      }),
    }),
  }),
});

export const { useAuthorizeMutation, useCheckoutMutation, useGetShareQuery, useSyncMutation } = sharesApi;
