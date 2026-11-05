"use client";

import Link from "next/link";
import { useGetContractsQuery } from "@/api/contractsApi";
import { Badge } from "@/components/Badge";
import { DataTable } from "@/components/DataTable";
import { FormError } from "@/components/FormError";
import { Mono } from "@/components/Money/styled";
import { Bone, Skeleton } from "@/components/Skeleton";
import { Frame } from "@/components/DataTable/styled";
import { StatusTag } from "@/components/StatusTag";
import { formatMoment, formatMoney } from "@/lib/format";
import { CONTRACT_STATUS_VIEW, DRAFT_STATUSES } from "@/lib/status";
import type { ContractSummary } from "@/types/generated/api-types";
import { Go, Head, Holds, Line, Root, Sub } from "./styled";

// Older API responses have no plan time zone: the viewer's own zone, named, is still correct.
const zoneOf = (plan: ContractSummary) => plan.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

const columns = [
  {
    header: "Plan",
    cell: (plan: ContractSummary) => (
      <>
        <Link href={`/plans/${plan.id}`}>{plan.title ?? "Untitled plan"}</Link>
        {plan.deadline_at ? <Sub>Deadline {formatMoment(plan.deadline_at, zoneOf(plan), true)}</Sub> : null}
      </>
    ),
  },
  {
    header: "Status",
    cell: (plan: ContractSummary) => (
      <StatusTag view={CONTRACT_STATUS_VIEW[plan.status]} live={plan.status === "active"} />
    ),
  },
  {
    header: "Holds",
    cell: (plan: ContractSummary) => (
      <Holds>
        {plan.headcount === null ? null : (
          <span aria-hidden="true">
            {Array.from({ length: plan.headcount }, (_, index) => (
              <i key={index} data-on={index < plan.held_count} />
            ))}
          </span>
        )}
        <span>{plan.headcount === null ? "—" : `${plan.held_count} of ${plan.headcount} held`}</span>
      </Holds>
    ),
  },
  {
    header: "Total",
    align: "right" as const,
    cell: (plan: ContractSummary) =>
      plan.headcount !== null && plan.share_cents !== null ? (
        <Mono>{formatMoney(plan.headcount * plan.share_cents)}</Mono>
      ) : null,
  },
  {
    header: "Type",
    cell: (plan: ContractSummary) => <Badge>{plan.money_source === "sample" ? "Sample" : "Sandbox"}</Badge>,
  },
  {
    header: "Open",
    hideHeader: true,
    cell: () => (
      <Go aria-hidden="true" data-go>
        →
      </Go>
    ),
  },
];

/** Three rows in the table's frame, at the table's row height. */
const PlansSkeleton = () => (
  <Skeleton label="Loading your plans…">
    <Frame>
      {[0, 1, 2].map((row) => (
        <Line key={row}>
          <Bone $w="14rem" />
          <Bone $w="5rem" $h="1.25rem" />
          <Bone $w="7rem" />
        </Line>
      ))}
    </Frame>
  </Skeleton>
);

export function PlansList() {
  const { data, error } = useGetContractsQuery();
  const plans = data?.filter((plan) => !DRAFT_STATUSES.has(plan.status));
  return (
    <Root aria-labelledby="plans-title">
      <Head>
        <h2 id="plans-title">Plans</h2>
        {plans ? <span>{plans.length === 1 ? "1 plan" : `${plans.length} plans`}</span> : null}
      </Head>
      <FormError error={error} />
      {plans ? <DataTable columns={columns} rows={plans} rowKey={(plan) => plan.id} /> : null}
      {plans || error ? null : <PlansSkeleton />}
    </Root>
  );
}
