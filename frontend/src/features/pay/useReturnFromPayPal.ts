import { useEffect, useRef, useState } from "react";
import type { ApiFailure } from "@/api/baseApi";
import { errorCode } from "@/api/baseApi";
import { useAuthorizeMutation } from "@/api/sharesApi";

/**
 * Answers worth asking again. Another friend may be confirming, which holds the plan's lock. `internal` can mean the
 * hold was stored and only the reply failed, and asking again returns that hold without calling PayPal.
 */
const TRY_AGAIN = ["resolve_in_progress", "internal"];

/** Ten waits, to outlast the slowest authorize: two PayPal calls at their 15 second timeout. */
const RETRY_WAIT_MS = 3_000;
const MAX_TRIES = 11;

export interface PayPalReturn {
  /** PayPal sent the friend back and the answer has not arrived yet. */
  confirming: boolean;
  holdId: string | null;
  error: ApiFailure | undefined;
}

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** True when the server gave a real answer. Otherwise the token stays, so a refresh can ask again. */
function answered(error: ApiFailure | undefined): boolean {
  if (!error) return true;
  const code = errorCode(error);
  return code !== null && !TRY_AGAIN.includes(code);
}

/**
 * Finishes the return from PayPal once. Asking twice would be safe, because the server places one hold per order, but
 * the address drops the token after a real answer, so a refresh never asks at all. `refresh` runs before the answer
 * shows, so the page never flashes the old status.
 */
export function useReturnFromPayPal(
  shareId: string,
  orderId: string | null,
  refresh: () => unknown,
): PayPalReturn {
  const [authorize] = useAuthorizeMutation();
  const [result, setResult] = useState<Omit<PayPalReturn, "confirming"> | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (orderId === null || started.current) return;
    started.current = true;

    const askUntilAnswered = async () => {
      for (let tries = 1; ; tries += 1) {
        const answer = await authorize({ shareId, orderId });
        if (!TRY_AGAIN.includes(errorCode(answer.error) ?? "") || tries === MAX_TRIES) return answer;
        await wait(RETRY_WAIT_MS);
      }
    };

    const finish = async () => {
      const answer = await askUntilAnswered();
      if (answered(answer.error)) window.history.replaceState(null, "", window.location.pathname);
      await refresh();
      setResult({ holdId: answer.data?.share.authorization_id ?? null, error: answer.error });
    };
    void finish();
  }, [authorize, orderId, refresh, shareId]);

  return {
    confirming: orderId !== null && result === null,
    holdId: result?.holdId ?? null,
    error: result?.error,
  };
}
