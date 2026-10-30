"use client";

import { useEffect, useState } from "react";
import { baseApi } from "@/api/baseApi";
import { useAppDispatch } from "@/store/hooks";
import type { ContractChangedEvent, JoinAck } from "@/types/generated/api-types";
import { getSocket } from "./client";

/** While the socket is down, the board asks the API this often instead (docs/spec/scheduler.md, Data). */
export const FALLBACK_POLL_MS = 10_000;

/**
 * Joins the plan's room and turns each `contract:changed` into cache invalidations, so a payment made on a phone
 * refreshes the board within a second. Events carry no state: the REST read model stays the single source of truth.
 * Returns the `pollingInterval` for the queries: 0 while the socket is joined, the fallback while it is not.
 */
export function useContractLive(contractId: string): number {
  const dispatch = useAppDispatch();
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    let seen = 0;
    const join = () => {
      socket.emit("contract:join", { contractId }, (ack: JoinAck) => setJoined(ack.ok));
    };
    const changed = (event: ContractChangedEvent) => {
      if (event.contractId !== contractId || event.version <= seen) return;
      seen = event.version;
      dispatch(
        baseApi.util.invalidateTags([
          { type: "Contract", id: contractId },
          { type: "Scheduler", id: contractId },
          "ContractList",
        ]),
      );
    };
    const lost = () => setJoined(false);

    socket.on("connect", join);
    socket.on("disconnect", lost);
    socket.on("contract:changed", changed);
    if (socket.connected) join();
    else socket.connect();

    return () => {
      socket.off("connect", join);
      socket.off("disconnect", lost);
      socket.off("contract:changed", changed);
      socket.disconnect();
    };
  }, [contractId, dispatch]);

  return joined ? 0 : FALLBACK_POLL_MS;
}
