"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGetMeQuery, useLogoutMutation } from "@/api/authApi";
import { baseApi } from "@/api/baseApi";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Header } from "@/components/Header";
import { NavMenu } from "@/components/NavMenu";
import { daysUntil } from "@/lib/format";
import { useAppDispatch } from "@/store/hooks";
import { Tagline, User } from "./styled";

// The dialog pulls in MUI's modal code, which nobody needs until they press the button.
const ResetDialog = dynamic(() => import("../ResetDialog").then((module) => module.ResetDialog));

const isUnauthorized = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "status" in error && error.status === 401;

/** The bar on every organizer screen. It owns the session: a 401 here sends the visitor to sign in. */
export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  // Signing out clears the cache, which would refetch the user here and turn a clean exit into "please sign in".
  const [leaving, setLeaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [now] = useState(() => Date.now());
  const { data: user, error } = useGetMeQuery(undefined, { skip: leaving });
  const [logout, { isLoading }] = useLogoutMutation();
  const signedOut = isUnauthorized(error);

  useEffect(() => {
    if (!signedOut) return;
    const next = pathname + window.location.search;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [signedOut, pathname, router]);

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

  const guestDays = user?.expires_at ? daysUntil(user.expires_at, now) : null;

  return (
    <Header>
      <Tagline>Nobody pays unless the group makes it.</Tagline>
      <NavMenu
        links={[
          {
            key: "plans",
            render: (close) => (
              <Link href="/plans" onClick={close} aria-current={pathname === "/plans" ? "page" : undefined}>
                Plans
              </Link>
            ),
          },
        ]}
        actions={
          <>
            {user ? (
              <User>
                {user.display_name}
                {guestDays === null ? null : (
                  <Badge>
                    Guest · expires in {guestDays} {guestDays === 1 ? "day" : "days"}
                  </Badge>
                )}
              </User>
            ) : null}
            <Button variant="secondary" small arrow={false} onClick={() => setResetting(true)}>
              Reset demo data
            </Button>
            <Button variant="link" arrow={false} disabled={isLoading} onClick={() => void signOut()}>
              Sign out
            </Button>
          </>
        }
      />
      {resetting ? <ResetDialog onClose={() => setResetting(false)} /> : null}
    </Header>
  );
}
