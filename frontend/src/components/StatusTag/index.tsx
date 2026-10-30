"use client";

import { useState } from "react";
import type { StatusView } from "@/lib/status";
import { Tag } from "./styled";

interface StatusTagProps {
  /** Take it from `SHARE_STATUS_VIEW` or `CONTRACT_STATUS_VIEW`, never write a label here. */
  view: StatusView;
}

/** Pops when its status changes (a hold arriving), never on first paint. */
export function StatusTag({ view }: StatusTagProps) {
  const [first] = useState(view.label);
  return (
    <Tag key={view.label} $tone={view.tone} data-pop={first === view.label ? undefined : true}>
      {view.label}
    </Tag>
  );
}
