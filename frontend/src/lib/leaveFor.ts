/** A full page load, because PayPal's approval page cannot open inside ours. */
export function leaveFor(url: string): void {
  window.location.assign(url);
}
