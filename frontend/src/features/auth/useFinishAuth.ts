import { useRouter } from "next/navigation";
import { safeNext } from "@/lib/safeNext";

/**
 * Goes where the visitor was heading. It reads `?next=` at the moment of use, because `useSearchParams` would make
 * the whole sign-in page render on the client.
 */
export function useFinishAuth(): () => void {
  const router = useRouter();
  return () => router.push(safeNext(new URLSearchParams(window.location.search).get("next")));
}
