"use client";

import { useEffect, useRef, useTransition } from "react";
import type { FormEvent, ReactNode } from "react";
import { useGetMeQuery } from "@/api/authApi";
import type { ApiFailure } from "@/api/baseApi";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { useFinishAuth } from "../../useFinishAuth";
import { Fields, Switch } from "../AuthShell/styled";

interface AuthFormProps {
  title: string;
  /** The line under the title. The tabs above the form link to the other one. */
  lead: string;
  submitLabel: string;
  busyLabel: string;
  busy: boolean;
  error: ApiFailure | undefined;
  /** Sends the form. Resolves true when the visitor is signed in. */
  send: (form: FormData) => Promise<boolean>;
  children: ReactNode;
}

/** Everything sign in and create account share. Each one brings its fields and its request. */
export function AuthForm({
  title,
  lead,
  submitLabel,
  busyLabel,
  busy,
  error,
  send,
  children,
}: AuthFormProps) {
  const finish = useFinishAuth();
  const [leaving, leave] = useTransition();
  const working = busy || leaving;
  // A visitor whose session is still good goes straight on instead of signing in again. The API is the judge.
  const { data: me } = useGetMeQuery();
  const sent = useRef(false);
  useEffect(() => {
    if (!me || sent.current) return;
    sent.current = true;
    leave(finish);
  }, [finish, me]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await send(new FormData(event.currentTarget))) leave(finish);
  };

  return (
    <>
      <h1>{title}</h1>
      <Switch>{lead}</Switch>
      <Fields onSubmit={(event) => void submit(event)}>
        {children}
        <FormError error={error} />
        <Button type="submit" block loading={working}>
          {working ? busyLabel : submitLabel}
        </Button>
      </Fields>
    </>
  );
}
