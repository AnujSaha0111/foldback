"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGetMeQuery, useLogoutMutation } from "@/api/authApi";
import { baseApi } from "@/api/baseApi";
import { Button } from "@/components/Button";
import { useAppDispatch } from "@/store/hooks";

const isUnauthorized = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "status" in error && error.status === 401;

/** Stands in for the plans screen until 5c, so the whole sign-in path can be tried end to end. */
export function SessionPreview() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  // Signing out clears the cache, which would refetch the user here and turn a clean exit into "please sign in".
  const [leaving, setLeaving] = useState(false);
  const { data: user, error } = useGetMeQuery(undefined, { skip: leaving });
  const [logout, { isLoading }] = useLogoutMutation();
  const signedOut = isUnauthorized(error);

  useEffect(() => {
    if (signedOut) router.replace("/login?next=/plans");
  }, [signedOut, router]);

  const signOut = async () => {
    setLeaving(true);
    const result = await logout();
    if ("error" in result) {
      setLeaving(false);
      return;
    }
    dispatch(baseApi.util.resetApiState());
    router.push("/");
  };

  if (!user) return null;
  return (
    <>
      <h1>Hello, {user.display_name}</h1>
      <p>Your plans arrive in the next phase.</p>
      <Button variant="secondary" disabled={isLoading} onClick={() => void signOut()}>
        Sign out
      </Button>
    </>
  );
}
