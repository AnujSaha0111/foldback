"use client";

import dynamic from "next/dynamic";
import { useGetSchedulerQuery } from "@/api/schedulerApi";
import { FormError } from "@/components/FormError";
import { Loading } from "@/components/Spinner";
import { Caption, Frame, Legend, Placeholder } from "./styled";

const LoadingBoard = () => (
  <Placeholder>
    <Loading label="Loading the board…" />
  </Placeholder>
);

// Bryntum needs `window`, so it is never rendered on the server, and nothing else imports it: the landing, auth and
// plans bundles stay free of it (docs/spec/scheduler.md).
const FoldbackScheduler = dynamic(() => import("./FoldbackScheduler"), { ssr: false, loading: LoadingBoard });

interface SchedulerPanelProps {
  contractId: string;
  /** 0 while the socket is live, otherwise how often to ask the API (see useContractLive). */
  pollingInterval: number;
  onSelect: (shareId: string) => void;
  /** A clock move the assistant proposed and nobody has approved yet: drawn dashed (scheduler.md). */
  proposedAt?: string | null;
}

/** The board and its caption. The data is the server's projection; selecting a person never moves money. */
export function SchedulerPanel({
  contractId,
  pollingInterval,
  onSelect,
  proposedAt = null,
}: SchedulerPanelProps) {
  const { data, error } = useGetSchedulerQuery(contractId, { pollingInterval });
  if (!data) return error ? <FormError error={error} /> : <LoadingBoard />;

  return (
    <Frame>
      <FoldbackScheduler projection={data} onSelect={onSelect} proposedAt={proposedAt} />
      <Caption>
        <span>Rows are people. Every bar carries its status word. Select a person to see their hold.</span>
        <Legend aria-hidden="true">
          <span data-kind="now">Now</span>
          <span data-kind="deadline">Deadline</span>
          <span data-kind="grace">Grace ends</span>
        </Legend>
      </Caption>
    </Frame>
  );
}
