import type { Server } from "socket.io";
import type { ContractChangedEvent, ShareChangedEvent } from "../shared/api-types";

/**
 * Tells connected browsers that something changed. Call it only AFTER the database transaction has committed, so
 * a client that refetches always sees the new state. Events carry ids and a version, never state.
 */
export interface Notifier {
  contractChanged(contractId: string, version: number): void;
  shareChanged(shareId: string, contractId: string): void;
}

/**
 * A notifier that can be handed to the services before the socket server exists. The HTTP app is built first and the
 * socket server needs the HTTP server, so the two meet here: events before `bind` have nobody to tell, and are dropped.
 */
export function createDeferredNotifier(): { notifier: Notifier; bind(io: Server): void } {
  let real: Notifier | null = null;
  return {
    notifier: {
      contractChanged: (contractId, version) => real?.contractChanged(contractId, version),
      shareChanged: (shareId, contractId) => real?.shareChanged(shareId, contractId),
    },
    bind: (io) => {
      real = createNotifier(io);
    },
  };
}

export function createNotifier(io: Server): Notifier {
  return {
    contractChanged: (contractId, version) => {
      const event: ContractChangedEvent = { contractId, version };
      io.to(`contract:${contractId}`).emit("contract:changed", event);
    },
    shareChanged: (shareId, contractId) => {
      const event: ShareChangedEvent = { shareId, contractId };
      io.to(`share:${shareId}`).emit("share:changed", event);
    },
  };
}
