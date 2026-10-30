"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Money } from "@/components/Money";
import { Mono } from "@/components/Money/styled";
import { StatusTag } from "@/components/StatusTag";
import { formatMoment } from "@/lib/format";
import { SHARE_STATUS_VIEW } from "@/lib/status";
import type { ApiShare } from "@/types/generated/api-types";
import { Actions, Amount, Body, Empty, Facts, Head, Name, Root, Top } from "./styled";

interface PersonCardProps {
  share: ApiShare | undefined;
  timeZone: string;
  /** The plan's grace end, shown for the person who has it. */
  graceUntil: string | null;
}

/** The selected share: who, how much, its status, and the PayPal facts behind it. */
export function PersonCard({ share, timeZone, graceUntil }: PersonCardProps) {
  return (
    <Root aria-labelledby="person-title" aria-live="polite">
      <Head>
        <h2 id="person-title">Person</h2>
        <span>Selected on the board</span>
      </Head>
      {share ? (
        <Details key={share.id} share={share} timeZone={timeZone} graceUntil={graceUntil} />
      ) : (
        <Empty>Select a person on the schedule.</Empty>
      )}
    </Root>
  );
}

function Details({ share, timeZone, graceUntil }: PersonCardProps & { share: ApiShare }) {
  const [copied, setCopied] = useState(false);
  const sandbox = share.money_source !== "sample";
  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${share.pay_path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Body>
      <Top>
        <Avatar name={share.display_name} size="lg" />
        <Name>
          <strong>{share.display_name}</strong>
          <div>
            <StatusTag view={SHARE_STATUS_VIEW[share.status]} />
            <Badge>{share.sample_label ?? (sandbox ? "Sandbox" : "Sample")}</Badge>
          </div>
        </Name>
        <Amount>
          <Money cents={share.amount_cents} />
        </Amount>
      </Top>
      <HoldFacts share={share} timeZone={timeZone} graceUntil={graceUntil} />
      {sandbox && share.payable ? (
        <Actions>
          <Button small arrow={false} onClick={() => void copy()}>
            {copied ? "Copied" : "Copy pay link"}
          </Button>
          <ButtonLink href={share.pay_path} variant="secondary" small arrow={false}>
            Open pay link ↗
          </ButtonLink>
        </Actions>
      ) : null}
    </Body>
  );
}

/** The PayPal facts behind a share: its hold, when that expires, grace, capture and its pay link. */
function HoldFacts({ share, timeZone, graceUntil }: PersonCardProps & { share: ApiShare }) {
  return (
    <Facts>
      <dt>Authorization</dt>
      <dd>{share.authorization_id ? <Mono>{share.authorization_id}</Mono> : "No hold yet"}</dd>
      {share.authorization_expires_at ? (
        <>
          <dt>Hold expires</dt>
          <dd>{formatMoment(share.authorization_expires_at, timeZone, true)}</dd>
        </>
      ) : null}
      {share.is_grace_subject && graceUntil ? (
        <>
          <dt>Grace</dt>
          <dd>Until {formatMoment(graceUntil, timeZone, true)}</dd>
        </>
      ) : null}
      {share.capture_id || share.status === "released" ? (
        <>
          <dt>Capture</dt>
          <dd>{share.capture_id ? <Mono>{share.capture_id}</Mono> : "Released (VOIDED)"}</dd>
        </>
      ) : null}
      <dt>Pay link</dt>
      <dd>
        <Mono>{share.pay_path}</Mono>
      </dd>
    </Facts>
  );
}
