"use client";

import { useTransition } from "react";
import { useGuestMutation } from "@/api/authApi";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { useFinishAuth } from "../../useFinishAuth";

interface GuestButtonProps {
  small?: boolean;
  block?: boolean;
  variant?: "sun" | "ink" | "primary" | "secondary";
}

/** Creates a private guest workspace, then goes to it. */
export function GuestButton({ small = false, block = false, variant = "primary" }: GuestButtonProps) {
  const [startGuest, { isLoading, error }] = useGuestMutation();
  const finish = useFinishAuth();
  // The transition keeps the spinner going through the page change, so the button never goes idle in between.
  const [leaving, leave] = useTransition();
  const busy = isLoading || leaving;

  const start = async () => {
    const result = await startGuest();
    if ("data" in result) leave(finish);
  };

  return (
    <div>
      <Button small={small} block={block} variant={variant} loading={busy} onClick={() => void start()}>
        {busy ? "Starting…" : "Try it as a guest"}
      </Button>
      <FormError error={error} />
    </div>
  );
}
