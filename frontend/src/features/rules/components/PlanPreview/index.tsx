"use client";

import { useGetContractQuery } from "@/api/contractsApi";
import { ButtonLink } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { FormError } from "@/components/FormError";
import { Money } from "@/components/Money";
import { StatusTag } from "@/components/StatusTag";
import { CONTRACT_STATUS_VIEW, SHARE_STATUS_VIEW } from "@/lib/status";
import type { ApiShare } from "@/types/generated/api-types";
import { Note, Title } from "./styled";

const columns = [
  { header: "Person", cell: (share: ApiShare) => share.display_name },
  { header: "Status", cell: (share: ApiShare) => <StatusTag view={SHARE_STATUS_VIEW[share.status]} /> },
  { header: "Share", cell: (share: ApiShare) => <Money cents={share.amount_cents} /> },
];

interface PlanPreviewProps {
  id: string;
}

/** Stands in for the board until 5d, so confirming a plan lands somewhere real. */
export function PlanPreview({ id }: PlanPreviewProps) {
  const { data, error } = useGetContractQuery(id);
  return (
    <>
      <FormError error={error} />
      {data ? (
        <>
          <Title>
            <h1>{data.contract.title ?? "Untitled plan"}</h1>
            <StatusTag view={CONTRACT_STATUS_VIEW[data.contract.status]} />
          </Title>
          <DataTable columns={columns} rows={data.shares} rowKey={(share) => share.id} />
          <Note>The live board arrives in the next phase.</Note>
        </>
      ) : null}
      <ButtonLink href="/plans" variant="link" arrow={false}>
        Back to plans
      </ButtonLink>
    </>
  );
}
