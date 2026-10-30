"use client";

import { useState } from "react";
import type { StatusView } from "@/lib/status";
import { Live, Tag } from "./styled";

interface StatusTagProps {
  /** Take it from `SHARE_STATUS_VIEW` or `CONTRACT_STATUS_VIEW`, never write a label here. */
  view: StatusView;
  /** A pulsing dot for a plan that is collecting right now. */
  live?: boolean;
}

/** Pops when its status changes (a hold arriving), never on first paint. */
export function StatusTag({ view, live = false }: StatusTagProps) {
  const [first] = useState(view.label);
  return (
    <Tag key={view.label} $tone={view.tone} data-pop={first === view.label ? undefined : true}>
      {live ? <Live aria-hidden="true" /> : null}
      {view.label}
    </Tag>
  );
}
