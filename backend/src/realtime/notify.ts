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
