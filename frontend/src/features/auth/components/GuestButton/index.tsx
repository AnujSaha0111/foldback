"use client";

import { useGuestMutation } from "@/api/authApi";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { useFinishAuth } from "../../useFinishAuth";

interface GuestButtonProps {
  small?: boolean;
  block?: boolean;
  variant?: "sun" | "primary" | "secondary";
}

/** Creates a private guest workspace, then goes to it. */
export function GuestButton({ small = false, block = false, variant = "primary" }: GuestButtonProps) {
  const [startGuest, { isLoading, error }] = useGuestMutation();
  const finish = useFinishAuth();

  const start = async () => {
    const result = await startGuest();
    if ("data" in result) finish();
  };

  return (
    <div>
      <Button small={small} block={block} variant={variant} disabled={isLoading} onClick={() => void start()}>
        {isLoading ? "Starting…" : "Try it as a guest"}
      </Button>
      <FormError error={error} />
    </div>
  );
}
