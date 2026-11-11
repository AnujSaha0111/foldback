"use client";

import { useMemo } from "react";
import type { ContractChangedEvent } from "@/types/generated/api-types";
import { useRoom } from "./useRoom";
import type { Room } from "./useRoom";

/** A plan's room. It remembers the last version it saw, so a repeated event refreshes nothing. */
function contractRoom(contractId: string): Room<ContractChangedEvent> {
  let seen = 0;
  const tags: Room<ContractChangedEvent>["refresh"] = [
    { type: "Contract", id: contractId },
    { type: "Scheduler", id: contractId },
    "ContractList",
  ];
  return {
    join: "contract:join",
    payload: { contractId },
    changed: "contract:changed",
    tagsFor: (event) => {
      if (event.contractId !== contractId || event.version <= seen) return null;
      seen = event.version;
      return tags;
    },
    refresh: tags,
  };
}

/** Keeps a plan's board live, so a payment made on a phone refreshes it within a second. See `useRoom`. */
export function useContractLive(contractId: string): number {
  return useRoom(useMemo(() => contractRoom(contractId), [contractId]));
}
