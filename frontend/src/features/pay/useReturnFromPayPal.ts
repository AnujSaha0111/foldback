import { useEffect, useRef, useState } from "react";
import type { ApiFailure } from "@/api/baseApi";
import { errorCode } from "@/api/baseApi";
import { useAuthorizeMutation, useSyncMutation } from "@/api/sharesApi";
import type { ShareStatus } from "@/types/generated/statuses";

/**
 * Answers worth asking again. Another friend may be confirming, which holds the plan's lock. `internal` can mean the
 * hold was stored and only the reply failed, and asking again returns that hold without calling PayPal.
 */
const TRY_AGAIN = ["resolve_in_progress", "internal"];

/** Ten waits, to outlast the slowest authorize: two PayPal calls at their 15 second timeout. */
const RETRY_WAIT_MS = 3_000;
const MAX_TRIES = 11;

/** How PayPal sent the friend back: approved with an order, or cancelled. Neither when the page was opened directly. */
export interface Returned {
  orderId: string | null;
  cancelled: boolean;
}

export interface PayPalReturn {
  /** PayPal sent the friend back and the answer has not arrived yet. */
  confirming: boolean;
  holdId: string | null;
  error: ApiFailure | undefined;
}

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** True when the server gave a real answer. Otherwise the query stays, so a refresh can ask again. */
function answered(error: ApiFailure | undefined): boolean {
  if (!error) return true;
  const code = errorCode(error);
  return code !== null && !TRY_AGAIN.includes(code);
}

async function askUntilAnswered<T extends { error?: ApiFailure | undefined }>(
  ask: () => PromiseLike<T>,
): Promise<T> {
  for (let tries = 1; ; tries += 1) {
    const answer = await ask();
    if (!TRY_AGAIN.includes(errorCode(answer.error) ?? "") || tries === MAX_TRIES) return answer;
    await wait(RETRY_WAIT_MS);
  }
}

/**
 * Finishes the return from PayPal once: authorize after an approval, sync after a cancel. Asking twice would be safe,
 * because the server acts once per order, but the address drops the query after a real answer, so a refresh never
 * asks at all. `refresh` runs before the answer shows, so the page never flashes the old status.
 */
export function useReturnFromPayPal(
  shareId: string,
  { orderId, cancelled }: Returned,
  refresh: () => unknown,
): PayPalReturn {
  const [authorize] = useAuthorizeMutation();
  const [sync] = useSyncMutation();
  const [result, setResult] = useState<Omit<PayPalReturn, "confirming"> | null>(null);
  const started = useRef(false);
  const returned = cancelled || orderId !== null;

  useEffect(() => {
    if (!returned || started.current) return;
    started.current = true;

    const finish = async () => {
      let holdId: string | null = null;
      let error: ApiFailure | undefined;
      if (orderId === null) {
        ({ error } = await askUntilAnswered(() => sync({ shareId, buyerCancelled: true })));
      } else {
        const answer = await askUntilAnswered(() => authorize({ shareId, orderId }));
        holdId = answer.data?.share.authorization_id ?? null;
        error = answer.error;
      }
      if (answered(error)) window.history.replaceState(null, "", window.location.pathname);
      await refresh();
      setResult({ holdId, error });
    };
    void finish();
  }, [authorize, orderId, refresh, returned, shareId, sync]);

  return {
    confirming: returned && result === null,
    holdId: result?.holdId ?? null,
    error: result?.error,
  };
}

/**
 * A share left unknown asks PayPal once when the page opens, so the friend is not left waiting on the organizer.
 * Off while a return is being confirmed, because that request holds the lock and the share reads unknown by design.
 */
export function useSettleUnknown(
  shareId: string,
  status: ShareStatus | undefined,
  enabled: boolean,
  refresh: () => unknown,
): void {
  const [sync] = useSyncMutation();
  const asked = useRef(false);

  useEffect(() => {
    if (!enabled || status !== "authorize_unknown" || asked.current) return;
    asked.current = true;
    void sync({ shareId }).then(() => refresh());
  }, [enabled, refresh, shareId, status, sync]);
}
