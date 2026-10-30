"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import type { ApiFailure } from "@/api/baseApi";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { useFinishAuth } from "../../useFinishAuth";
import { Fields, Switch } from "../AuthShell/styled";

interface AuthFormProps {
  title: string;
  /** The line under the title, and the link to the other form. */
  prompt: string;
  other: { href: string; label: string };
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
  prompt,
  other,
  submitLabel,
  busyLabel,
  busy,
  error,
  send,
  children,
}: AuthFormProps) {
  const finish = useFinishAuth();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await send(new FormData(event.currentTarget))) finish();
  };

  return (
    <>
      <h1>{title}</h1>
      <Switch>
        {prompt} <Link href={other.href}>{other.label}</Link>
      </Switch>
      <Fields onSubmit={(event) => void submit(event)}>
        {children}
        <FormError error={error} />
        <Button type="submit" block disabled={busy}>
          {busy ? busyLabel : submitLabel}
        </Button>
      </Fields>
    </>
  );
}
