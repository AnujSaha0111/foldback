import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  requestId: string;
  userId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function getContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Called by the auth guard once the user is known, so later log lines carry the id. */
export function setContextUser(userId: string): void {
  const context = storage.getStore();
  if (context) context.userId = userId;
}
