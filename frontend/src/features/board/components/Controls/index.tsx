"use client";

import { useState } from "react";
import { useMoveClockMutation, useResolvePlanMutation } from "@/api/contractsApi";
import { useSyncMutation } from "@/api/sharesApi";
import { Button } from "@/components/Button";
import { Callout } from "@/components/Callout";
import { FormError } from "@/components/FormError";
import { formatMoment } from "@/lib/format";
import type { ApiContract, ApiShare } from "@/types/generated/api-types";
import { UNKNOWN_SHARE_STATUSES } from "@/types/generated/statuses";
import { BannerAction, Buttons, Control, Root } from "./styled";

interface ControlsProps {
  contract: ApiContract;
  shares: ApiShare[];
}

/** The demo clock and Resolve (scheduler.md, "Operator controls"), and the Paused banner when a result is unknown. */
export function Controls({ contract, shares }: ControlsProps) {
  const [moveClock, clock] = useMoveClockMutation();
  const [resolvePlan, resolving] = useResolvePlanMutation();
  const zone = contract.timezone ?? "UTC";
  const closed = contract.status === "kept" || contract.status === "released";
  const busy = clock.isLoading || resolving.isLoading;
  const moves = [
    { label: "Advance to deadline", at: contract.deadline_at, none: "This plan has no deadline." },
    { label: "Advance to grace end", at: contract.grace_until, none: "This plan has no grace period." },
  ];

  return (
    <Root aria-label="Demo controls">
      {contract.status === "blocked" ? <Paused contract={contract} shares={shares} /> : null}
      <Buttons>
        {moves.map(({ label, at, none }) => (
          <Control key={label}>
            <Button
              small
              variant="secondary"
              arrow={false}
              disabled={closed || busy || !at}
              loading={clock.isLoading && clock.originalArgs?.demoNow === at}
              onClick={() => at && void moveClock({ id: contract.id, demoNow: at })}
            >
              {label}
            </Button>
            <small>{at ? `Moves Now to ${formatMoment(at, zone, true)}` : none}</small>
          </Control>
        ))}
        <Control>
          <Button
            small
            arrow={false}
            disabled={closed || busy}
            loading={resolving.isLoading}
            onClick={() => void resolvePlan(contract.id)}
          >
            Resolve now
          </Button>
          <small>{closed ? "This plan is decided." : "Applies the rule at the current time."}</small>
        </Control>
      </Buttons>
      <FormError error={clock.error ?? resolving.error} />
    </Root>
  );
}

/**
 * A paused plan. An unknown result offers Check payment: ask PayPal about each unclear share, then resolve. A refused
 * capture has no button, because only a person can sort that out.
 */
function Paused({ contract, shares }: ControlsProps) {
  const [sync] = useSyncMutation();
  const [resolvePlan, resolving] = useResolvePlanMutation();
  const [checking, setChecking] = useState(false);
  const refused = shares.some((share) => share.status === "capture_failed");
  const unknown = shares.filter((share) => UNKNOWN_SHARE_STATUSES.includes(share.status));

  const check = async () => {
    setChecking(true);
    for (const share of unknown) await sync({ shareId: share.id });
    await resolvePlan(contract.id);
    setChecking(false);
  };

  if (refused) {
    return (
      <Callout title="Paused" warn>
        {contract.resolution_reason}
      </Callout>
    );
  }
  return (
    <Callout title="Paused" warn>
      {unknown.length > 0
        ? "A PayPal result is unknown, so Foldback paused and sent nothing else. Check payment to continue."
        : contract.resolution_reason}
      <BannerAction>
        <Button small arrow={false} loading={checking} onClick={() => void check()}>
          Check payment
        </Button>
      </BannerAction>
      <FormError error={resolving.error} />
    </Callout>
  );
}
