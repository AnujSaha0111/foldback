/**
 * The caller's address, the way Express's `trust proxy` computes it: with N trusted proxy hops, the address N
 * entries from the right of X-Forwarded-For. Sockets need this because they do not go through Express.
 */
export function clientIp(
  forwardedFor: string | string[] | undefined,
  remoteAddress: string,
  trustProxy: number,
): string {
  if (trustProxy <= 0 || forwardedFor === undefined) return remoteAddress;
  const header = Array.isArray(forwardedFor) ? forwardedFor.join(",") : forwardedFor;
  const hops = header
    .split(",")
    .map((h) => h.trim())
    .filter((h) => h !== "");
  if (hops.length === 0) return remoteAddress;
  return hops[Math.max(0, hops.length - trustProxy)] ?? remoteAddress;
}
