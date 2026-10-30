"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useGetContractQuery } from "@/api/contractsApi";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { Mono } from "@/components/Money/styled";
import { StatusTag } from "@/components/StatusTag";
import { formatMoment, formatMoney } from "@/lib/format";
import { CONTRACT_STATUS_VIEW, HOLDING_SHARE_STATUSES } from "@/lib/status";
import { useContractLive } from "@/sockets/useContractLive";
import type { ApiContract, ApiShare } from "@/types/generated/api-types";
import { PersonCard } from "../PersonCard";
import { SchedulerPanel } from "../SchedulerPanel";
import { Back, Head, Layout, Meter, Reason, Squares, Stat, Stats, Urgent } from "./styled";

const HOUR_MS = 3_600_000;

/** "In 2 hours", "In 3 days" or "Deadline passed", measured from the demo clock. */
function timeLeft(now: string, deadline: string): string {
  const hours = Math.round((new Date(deadline).getTime() - new Date(now).getTime()) / HOUR_MS);
  if (hours <= 0) return "Deadline passed";
  if (hours < 48) return `In ${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `In ${Math.round(hours / 24)} days`;
}

/** "Maya has grace until Mon 9 Nov" for the stat strip. */
const graceLine = (name: string, until: string, timeZone: string) =>
  ` · ${name.split(" ")[0]} has grace until ${formatMoment(until, timeZone, true).split(",")[0]}`;

/** The plan's board: the numbers that matter, people across the days, and the selected person's hold. */
export function Board({ id }: { id: string }) {
  const pollingInterval = useContractLive(id);
  const { data, error } = useGetContractQuery(id, { pollingInterval });
  const [picked, setPicked] = useState<string | null>(null);
  if (!data) return <FormError error={error} />;
  const { contract, shares } = data;
  // Until someone is chosen, show the one the plan is waiting on.
  const selectedId = picked ?? (shares.find((share) => share.status === "waiting") ?? shares[0])?.id ?? null;
  const timeZone = contract.timezone ?? "UTC";

  return (
    <>
      <Head>
        <h1>{contract.title ?? "Untitled plan"}</h1>
        <StatusTag view={CONTRACT_STATUS_VIEW[contract.status]} live={contract.status === "active"} />
        <Badge>{contract.money_source === "sample" ? "Sample" : "Sandbox"}</Badge>
      </Head>
      <Numbers contract={contract} shares={shares} timeZone={timeZone} />
      {contract.resolution_reason ? <Reason aria-live="polite">{contract.resolution_reason}</Reason> : null}
      <Layout>
        <SchedulerPanel contractId={id} pollingInterval={pollingInterval} onSelect={setPicked} />
        <PersonCard
          share={shares.find((share) => share.id === selectedId)}
          timeZone={timeZone}
          graceUntil={contract.grace_until}
        />
      </Layout>
      <Back>
        <ButtonLink href="/plans" variant="link" arrow={false}>
          Back to plans
        </ButtonLink>
      </Back>
    </>
  );
}

function Numbers({
  contract,
  shares,
  timeZone,
}: {
  contract: ApiContract;
  shares: ApiShare[];
  timeZone: string;
}) {
  const held = shares.filter((share) => HOLDING_SHARE_STATUSES.has(share.status));
  const total = contract.total_cents ?? shares.reduce((sum, share) => sum + share.amount_cents, 0);
  const heldCents = held.reduce((sum, share) => sum + share.amount_cents, 0);
  const extra = contract.kept_count
    ? ` · ${contract.kept_count} kept`
    : contract.released_count
      ? ` · ${contract.released_count} released`
      : "";
  return (
    <Stats aria-label="Plan summary">
      <Stat>
        <span>Holds</span>
        <div>
          <Squares aria-hidden="true">
            {shares.map((share) => (
              <i key={share.id} data-on={HOLDING_SHARE_STATUSES.has(share.status)} />
            ))}
          </Squares>
          {contract.held_count} of {contract.headcount ?? shares.length} held{extra}
        </div>
      </Stat>
      <Stat>
        <span>Held so far</span>
        <div>
          <Mono>{formatMoney(heldCents)}</Mono>
          <small style={{ fontWeight: 400, color: "var(--text-2)" }}>of {formatMoney(total)}</small>
        </div>
        <Meter aria-hidden="true" style={{ "--v": total ? heldCents / total : 0 } as CSSProperties}>
          <i />
        </Meter>
      </Stat>
      <Stat>
        <span>Now</span>
        <div>{contract.demo_now ? <Mono>{formatMoment(contract.demo_now, timeZone, true)}</Mono> : "—"}</div>
        <small>Demo clock</small>
      </Stat>
      <Stat>
        <span>Deadline</span>
        <div>
          {contract.deadline_at ? <Mono>{formatMoment(contract.deadline_at, timeZone, true)}</Mono> : "—"}
        </div>
        <Urgent>
          {contract.deadline_at && contract.demo_now
            ? timeLeft(contract.demo_now, contract.deadline_at)
            : null}
          {contract.grace_person_name && contract.grace_until
            ? graceLine(contract.grace_person_name, contract.grace_until, timeZone)
            : null}
        </Urgent>
      </Stat>
    </Stats>
  );
}
