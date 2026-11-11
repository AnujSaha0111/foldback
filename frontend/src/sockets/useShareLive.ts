"use client";

import { useMemo } from "react";
import type { ShareChangedEvent } from "@/types/generated/api-types";
import { useRoom } from "./useRoom";
import type { Room } from "./useRoom";

/** Keeps a pay link's page live, for example to Kept when the last friend pays. See `useRoom`. */
export function useShareLive(shareId: string): number {
  const room = useMemo<Room<ShareChangedEvent>>(
    () => ({
      join: "share:join",
      payload: { shareId },
      changed: "share:changed",
      tagsFor: (event) => (event.shareId === shareId ? [{ type: "PublicShare", id: shareId }] : null),
      refresh: [{ type: "PublicShare", id: shareId }],
    }),
    [shareId],
  );
  return useRoom(room);
}
