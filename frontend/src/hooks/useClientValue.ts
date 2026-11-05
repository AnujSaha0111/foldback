import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/** A value only the browser knows. The server and hydration see `server`, and the browser's value follows at once. */
export function useClientValue<T>(read: () => T, server: T): T {
  return useSyncExternalStore(noSubscribe, read, () => server);
}
