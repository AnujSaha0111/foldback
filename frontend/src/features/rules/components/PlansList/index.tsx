"use client";

import Link from "next/link";
import { useGetContractsQuery } from "@/api/contractsApi";
import { Badge } from "@/components/Badge";
import { DataTable } from "@/components/DataTable";
import { FormError } from "@/components/FormError";
import { StatusTag } from "@/components/StatusTag";
import { CONTRACT_STATUS_VIEW } from "@/lib/status";
import type { ContractSummary } from "@/types/generated/api-types";
import type { ContractStatus } from "@/types/generated/statuses";
import { Holds, Root } from "./styled";

const columns = [
  {
    header: "Plan",
    cell: (plan: ContractSummary) => <Link href={`/plans/${plan.id}`}>{plan.title ?? "Untitled plan"}</Link>,
  },
  {
    header: "Status",
    cell: (plan: ContractSummary) => <StatusTag view={CONTRACT_STATUS_VIEW[plan.status]} />,
  },
  {
    header: "Holds",
    cell: (plan: ContractSummary) => (
      <Holds>{plan.headcount === null ? "—" : `${plan.held_count} of ${plan.headcount} held`}</Holds>
    ),
  },
  {
    header: "Type",
    cell: (plan: ContractSummary) => <Badge>{plan.money_source === "sample" ? "Sample" : "Sandbox"}</Badge>,
  },
];

/** A reading nobody has confirmed is not a plan yet: it has no people, no holds and no board to open. */
const DRAFTS: ReadonlySet<ContractStatus> = new Set([
  "extracting",
  "needs_clarification",
  "awaiting_confirmation",
]);

export function PlansList() {
  const { data, error } = useGetContractsQuery();
  const plans = data?.filter((plan) => !DRAFTS.has(plan.status));
  return (
    <Root aria-labelledby="plans-title">
      <h2 id="plans-title">Plans</h2>
      <FormError error={error} />
      {plans ? <DataTable columns={columns} rows={plans} rowKey={(plan) => plan.id} /> : null}
    </Root>
  );
}
