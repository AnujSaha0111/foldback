"use client";

import { useEffect, useState } from "react";
import { baseApi } from "@/api/baseApi";
import { useAppDispatch } from "@/store/hooks";
import type { JoinAck } from "@/types/generated/api-types";
import { getSocket } from "./client";

/** While the socket is down, a screen asks the API this often instead (docs/spec/scheduler.md, Data). */
export const FALLBACK_POLL_MS = 10_000;

type Tags = Parameters<typeof baseApi.util.invalidateTags>[0];

export interface Room<Event> {
  join: "contract:join" | "share:join";
  payload: object;
  changed: "contract:changed" | "share:changed";
  /** What to refresh for an event, or null to ignore it. */
  tagsFor: (event: Event) => Tags | null;
  /** Everything the screen shows from this room, refreshed once after the socket comes back from a gap. */
  refresh: Tags;
}

/**
 * Joins a room and turns its events into cache invalidations. Events carry no state: the REST read model stays the
 * single source of truth. Returns the `pollingInterval` for the screen's queries: 0 while joined, the fallback while
 * not. `room` must keep its identity between renders.
 */
export function useRoom<Event>(room: Room<Event>): number {
  const dispatch = useAppDispatch();
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    // A gap (an API restart, a dropped network) can hide an event or a failed first load, and polling stops once the
    // room is joined again, so the first join after a gap refreshes the screen.
    let missed = false;
    const join = () => {
      socket.emit(room.join, room.payload, (ack: JoinAck) => {
        setJoined(ack.ok);
        if (!ack.ok || !missed) return;
        missed = false;
        dispatch(baseApi.util.invalidateTags(room.refresh));
      });
    };
    const changed = (event: Event) => {
      const tags = room.tagsFor(event);
      if (tags) dispatch(baseApi.util.invalidateTags(tags));
    };
    const lost = () => {
      missed = true;
      setJoined(false);
    };

    socket.on("connect", join);
    socket.on("disconnect", lost);
    socket.on("connect_error", lost);
    socket.on(room.changed, changed);
    if (socket.connected) join();
    else socket.connect();

    return () => {
      socket.off("connect", join);
      socket.off("disconnect", lost);
      socket.off("connect_error", lost);
      socket.off(room.changed, changed);
      socket.disconnect();
    };
  }, [room, dispatch]);

  return joined ? 0 : FALLBACK_POLL_MS;
}
