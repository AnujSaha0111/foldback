import type { StatusView } from "@/lib/status";
import { Tag } from "./styled";

interface StatusTagProps {
  /** Take it from `SHARE_STATUS_VIEW` or `CONTRACT_STATUS_VIEW`, never write a label here. */
  view: StatusView;
}

export function StatusTag({ view }: StatusTagProps) {
  return <Tag $tone={view.tone}>{view.label}</Tag>;
}
