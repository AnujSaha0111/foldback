// Idempotency keys (docs/spec/paypal.md). Each is derived from the object being acted on, so a retry of the same
// action always reuses the same key, and PayPal replays the first result instead of acting twice.

/** One key per checkout attempt, so a new attempt after a declined checkout never replays the cancelled order. */
export function orderKey(shareId: string, checkoutAttempt: number): string {
  return `fb-order-${shareId}-${checkoutAttempt}`;
}

export function authorizeKey(orderId: string): string {
  return `fb-auth-${orderId}`;
}
