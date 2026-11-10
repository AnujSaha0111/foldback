"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Money } from "@/components/Money";
import { Mono } from "@/components/Money/styled";
import { StatusTag } from "@/components/StatusTag";
import { copyText } from "@/lib/copyText";
import { formatMoment } from "@/lib/format";
import { SHARE_STATUS_VIEW } from "@/lib/status";
import type { ApiShare } from "@/types/generated/api-types";
import { Actions, Amount, Body, Close, Empty, Facts, Head, Name, Picker, Root, Top } from "./styled";

interface PersonCardProps {
  share: ApiShare | undefined;
  /** Everyone on the plan, for the picker. */
  shares: ApiShare[];
  onSelect: (shareId: string) => void;
  timeZone: string;
  /** The plan's grace end, shown for the person who has it. */
  graceUntil: string | null;
  /** Closes the popup. */
  onClose: () => void;
}

type DetailsProps = Pick<PersonCardProps, "timeZone" | "graceUntil"> & { share: ApiShare };

/** The selected share: who, how much, its status, and the PayPal facts behind it. */
export function PersonCard({ share, shares, onSelect, timeZone, graceUntil, onClose }: PersonCardProps) {
  return (
    <Root aria-label={share ? share.display_name : "Person"}>
      <Head>
        <h2 id="person-title">Person</h2>
        <Picker
          aria-labelledby="person-title"
          value={share?.id ?? ""}
          onChange={(event) => onSelect(event.target.value)}
        >
          {shares.map((option) => (
            <option key={option.id} value={option.id}>
              {option.display_name}
            </option>
          ))}
        </Picker>
        <Close type="button" aria-label="Close" onClick={onClose}>
          ×
        </Close>
      </Head>
      {share ? (
        <Details key={share.id} share={share} timeZone={timeZone} graceUntil={graceUntil} />
      ) : (
        <Empty>Select a person on the schedule.</Empty>
      )}
    </Root>
  );
}

const COPY_LABEL = { idle: "Copy pay link", copied: "Copied", failed: "Copy failed: use Open pay link" };

function Details({ share, timeZone, graceUntil }: DetailsProps) {
  const [copy, setCopy] = useState<keyof typeof COPY_LABEL>("idle");
  const sandbox = share.money_source !== "sample";
  const copyLink = async () => {
    setCopy((await copyText(`${window.location.origin}${share.pay_path}`)) ? "copied" : "failed");
    setTimeout(() => setCopy("idle"), 1600);
  };

  return (
    <Body>
      <Top>
        <Avatar name={share.display_name} size="lg" />
        <Name>
          <strong>{share.display_name}</strong>
          <div>
            <span role="status">
              <StatusTag view={SHARE_STATUS_VIEW[share.status]} />
            </span>
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
          <Button small arrow={false} onClick={() => void copyLink()}>
            {COPY_LABEL[copy]}
          </Button>
          <ButtonLink href={share.pay_path} variant="secondary" small arrow={false}>
            Open pay link
          </ButtonLink>
        </Actions>
      ) : null}
    </Body>
  );
}

/** The PayPal facts behind a share: its hold, when that expires, grace, capture and its pay link. */
function HoldFacts({ share, timeZone, graceUntil }: DetailsProps) {
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
