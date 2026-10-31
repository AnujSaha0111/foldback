"use client";

import Link from "next/link";
import { useGetContractsQuery } from "@/api/contractsApi";
import { Badge } from "@/components/Badge";
import { DataTable } from "@/components/DataTable";
import { FormError } from "@/components/FormError";
import { Mono } from "@/components/Money/styled";
import { Loading } from "@/components/Spinner";
import { StatusTag } from "@/components/StatusTag";
import { formatMoment, formatMoney } from "@/lib/format";
import { CONTRACT_STATUS_VIEW } from "@/lib/status";
import type { ContractSummary } from "@/types/generated/api-types";
import type { ContractStatus } from "@/types/generated/statuses";
import { Go, Head, Holds, Root, Sub } from "./styled";

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
      <Head>
        <h2 id="plans-title">Plans</h2>
        {plans ? <span>{plans.length === 1 ? "1 plan" : `${plans.length} plans`}</span> : null}
      </Head>
      <FormError error={error} />
      {plans ? <DataTable columns={columns} rows={plans} rowKey={(plan) => plan.id} /> : null}
      {plans || error ? null : <Loading label="Loading your plans…" />}
    </Root>
  );
}
