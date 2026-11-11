"use client";

import Dialog from "@mui/material/Dialog";
import { useState } from "react";
import type { CSSProperties } from "react";
import { useGetContractQuery } from "@/api/contractsApi";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { Mono } from "@/components/Money/styled";
import { Bone, Skeleton } from "@/components/Skeleton";
import { Squares } from "@/components/Squares";
import { StatusTag } from "@/components/StatusTag";
import { formatMoment, formatMoney } from "@/lib/format";
import { CONTRACT_STATUS_VIEW } from "@/lib/status";
import { useContractLive } from "@/sockets/useContractLive";
import type { ApiContract, ApiShare } from "@/types/generated/api-types";
import { HOLDING_SHARE_STATUSES } from "@/types/generated/statuses";
import { AssistantCard } from "@/features/assistant/components/AssistantCard";
import { Controls } from "../Controls";
import { PersonCard } from "../PersonCard";
import { Picker } from "../PersonCard/styled";
import { SchedulerPanel } from "../SchedulerPanel";
import { Back, Head, Layout, Meter, Of, Pick, Reason, Stat, Stats, Urgent } from "./styled";

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
  `. ${name.split(" ")[0]} has grace until ${formatMoment(until, timeZone, true).split(",")[0]}`;

/** The plan's board: the numbers that matter, people across the days, and the selected person's hold. */
export function Board({ id }: { id: string }) {
  const pollingInterval = useContractLive(id);
  const { data, error } = useGetContractQuery(id, { pollingInterval });
  const [picked, setPicked] = useState<string | null>(null);
  const [proposedAt, setProposedAt] = useState<string | null>(null);
  if (!data) return error ? <FormError error={error} /> : <BoardSkeleton />;
  const { contract, shares } = data;
  const selected = shares.find((share) => share.id === picked);
  const close = () => setPicked(null);
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
      <Controls contract={contract} shares={shares} />
      {/* The schedule opens a person on click; this does the same from the keyboard. */}
      <Pick>
        <label htmlFor="show-person">Show a person</label>
        <Picker id="show-person" value="" onChange={(event) => setPicked(event.target.value || null)}>
          <option value="">Choose…</option>
          {shares.map((share) => (
            <option key={share.id} value={share.id}>
              {share.display_name}
            </option>
          ))}
        </Picker>
      </Pick>
      <Layout>
        <SchedulerPanel
          contractId={id}
          pollingInterval={pollingInterval}
          onSelect={setPicked}
          proposedAt={proposedAt}
        />
      </Layout>
      <Dialog
        open={selected !== undefined}
        onClose={close}
        aria-labelledby="person-title"
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { square: true, sx: { background: "transparent", boxShadow: "none" } } }}
      >
        <PersonCard
          share={selected}
          shares={shares}
          onSelect={setPicked}
          onClose={close}
          timeZone={timeZone}
          graceUntil={contract.grace_until}
        />
      </Dialog>
      <AssistantCard contract={contract} shares={shares} onProposed={setProposedAt} />
      <Back>
        <ButtonLink href="/plans" variant="link" arrow={false}>
          Back to plans
        </ButtonLink>
      </Back>
    </>
  );
}

/** The board's own shapes: the title, the four numbers and the schedule. */
function BoardSkeleton() {
  return (
    <Skeleton label="Loading the plan…">
      <Head>
        <Bone $w="16rem" $h="2.5rem" />
        <Bone $w="5rem" $h="1.5rem" />
      </Head>
      <Stats as="div">
        {[0, 1, 2, 3].map((stat) => (
          <Stat key={stat}>
            <Bone $w="5rem" $h="0.8125rem" />
            <div>
              <Bone $w="9rem" $h="1.25rem" />
            </div>
          </Stat>
        ))}
      </Stats>
      <Layout>
        <Bone $h="20rem" />
      </Layout>
    </Skeleton>
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
  const held = shares.filter((share) => HOLDING_SHARE_STATUSES.includes(share.status));
  const total = contract.total_cents ?? shares.reduce((sum, share) => sum + share.amount_cents, 0);
  const heldCents = held.reduce((sum, share) => sum + share.amount_cents, 0);
  const extra = contract.kept_count
    ? `, ${contract.kept_count} kept`
    : contract.released_count
      ? `, ${contract.released_count} released`
      : "";
  return (
    <Stats aria-label="Plan summary">
      <Stat>
        <span>Holds</span>
        <div>
          <Squares total={shares.length} on={held.length} />
          {contract.held_count} of {contract.headcount ?? shares.length} held{extra}
        </div>
      </Stat>
      <Stat>
        <span>Held so far</span>
        <div>
          <Mono>{formatMoney(heldCents)}</Mono>
          <Of>of {formatMoney(total)}</Of>
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
