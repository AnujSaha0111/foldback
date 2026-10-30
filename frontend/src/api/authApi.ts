import type { ApiUser } from "@/types/generated/api-types";
import { baseApi } from "./baseApi";

interface UserResponse {
  user: ApiUser;
}

interface LoginBody {
  email: string;
  password: string;
}

interface SignupBody extends LoginBody {
  display_name: string;
}

const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<ApiUser, void>({
      query: () => "/api/auth/me",
      transformResponse: (response: UserResponse) => response.user,
      providesTags: ["Me"],
    }),
    login: build.mutation<UserResponse, LoginBody>({
      query: (body) => ({ url: "/api/auth/login", method: "POST", body }),
      invalidatesTags: ["Me"],
    }),
    signup: build.mutation<UserResponse, SignupBody>({
      query: (body) => ({ url: "/api/auth/signup", method: "POST", body }),
      invalidatesTags: ["Me"],
    }),
    guest: build.mutation<UserResponse, void>({
      query: () => ({ url: "/api/auth/guest", method: "POST", body: {} }),
      invalidatesTags: ["Me"],
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: "/api/auth/logout", method: "POST", body: {} }),
    }),
  }),
});

export const { useGetMeQuery, useLoginMutation, useSignupMutation, useGuestMutation, useLogoutMutation } =
  authApi;
