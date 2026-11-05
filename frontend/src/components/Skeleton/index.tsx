import type { ReactNode } from "react";

export { Bone, Stack } from "./styled";

interface SkeletonProps {
  /** What is loading, read once by screen readers. The shapes themselves are hidden from them. */
  label: string;
  children: ReactNode;
}

/** A screen's shape while its data loads, so nothing jumps when it arrives. */
export function Skeleton({ label, children }: SkeletonProps) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}
