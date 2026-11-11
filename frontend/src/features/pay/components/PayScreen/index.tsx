"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { errorCode } from "@/api/baseApi";
import { useCheckoutMutation, useGetShareQuery, useSyncMutation } from "@/api/sharesApi";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { Header } from "@/components/Header";
import { Page } from "@/components/Page";
import { Bone, Skeleton, Stack } from "@/components/Skeleton";
import { Loading } from "@/components/Spinner";
import { Squares } from "@/components/Squares";
import { StatusTag } from "@/components/StatusTag";
import { formatMoney } from "@/lib/format";
import { leaveFor } from "@/lib/leaveFor";
import { SHARE_STATUS_VIEW } from "@/lib/status";
import { useShareLive } from "@/sockets/useShareLive";
import type { PublicShare } from "@/types/generated/api-types";
import { UNCLEAR_RESULT } from "@/types/generated/rules";
import { conditionText, payView, withOthers } from "../../payView";
import type { PayView } from "../../payView";
import { useReturnFromPayPal, useSettleUnknown } from "../../useReturnFromPayPal";
import type { PayPalReturn, Returned } from "../../useReturnFromPayPal";
import {
  Act,
  Amount,
  Band,
  Body,
  Column,
  Help,
  HoldId,
  Lead,
  Message,
  Others,
  Panel,
  Row,
  Who,
  WithMark,
} from "./styled";

interface PayScreenProps {
  shareId: string;
  /** How PayPal sent the friend back, if it did. */
  returned?: Returned;
}

const NOT_RETURNED: Returned = { orderId: null, cancelled: false };

/** The page a friend opens from a pay link. Mobile first, one column, and no scroll scenes. */
export function PayScreen({ shareId, returned = NOT_RETURNED }: PayScreenProps) {
  const pollingInterval = useShareLive(shareId);
  const { data, error, refetch } = useGetShareQuery(shareId, { pollingInterval });
  const paypalReturn = useReturnFromPayPal(shareId, returned, refetch);
  useSettleUnknown(shareId, data?.status, !paypalReturn.confirming, refetch);
  return (
    <Page
      compactFooter
      header={
        <Header>
          {data ? <Badge>{data.money_source === "sample" ? "Sample" : "Sandbox"}</Badge> : null}
        </Header>
      }
    >
      {data ? (
        <Share share={data} paypalReturn={paypalReturn} cancelled={returned.cancelled} />
      ) : error ? (
        <Column>
          <FormError error={error} />
        </Column>
      ) : (
        <PaySkeleton />
      )}
    </Page>
  );
}

/** The share's shapes: name, title and amount on the sky band, then the sheet below it. */
function PaySkeleton() {
  return (
    <Skeleton label="Loading your share…">
      <Band>
        <Column>
          <Stack>
            <Bone $w="12rem" />
            <Bone $w="16rem" $h="1.75rem" />
            <Bone $w="10rem" $h="4rem" />
          </Stack>
        </Column>
      </Band>
      <Body>
        <Column>
          <Stack>
            <Bone $w="14rem" $h="1.25rem" />
            <Bone $h="2.75rem" />
            <Bone $h="6rem" />
            <Bone $h="2.75rem" />
          </Stack>
        </Column>
      </Body>
    </Skeleton>
  );
}

interface ShareProps {
  share: PublicShare;
  paypalReturn: PayPalReturn;
  cancelled: boolean;
}

function Share({ share, paypalReturn, cancelled }: ShareProps) {
  const view = payView(share);
  const others = withOthers(share.other_names);
  const [firstStatus] = useState(share.status);
  const Sentence = view.final ? Lead : Message;
  return (
    <>
      <Band>
        <Column>
          <Who>{share.display_name}, your share for</Who>
          <h1>{share.title}</h1>
          <Amount>{formatMoney(share.amount_cents)}</Amount>
        </Column>
      </Band>
      <Body>
        <Column>
          {view.final ? null : (
            <>
              <Lead>This is a hold, not a charge.</Lead>
              <p>{conditionText(share)}</p>
            </>
          )}
          <Panel>
            <Row>
              <span>
                <Squares total={share.headcount} on={share.held_count} />
                {share.held_count} of {share.headcount} held
              </span>
            </Row>
            <Row>
              <span>{share.display_name} (you)</span>
              {/* The share reads as unknown during the call by design, which must not alarm the friend. */}
              {paypalReturn.confirming ? null : <StatusTag view={SHARE_STATUS_VIEW[share.status]} />}
            </Row>
            {others ? <Others>{others}</Others> : null}
          </Panel>
          <Act aria-live="polite">
            {paypalReturn.confirming ? (
              <Loading label={cancelled ? "Closing the checkout…" : "Confirming with PayPal…"} />
            ) : (
              <>
                {view.message ? (
                  <Sentence key={view.message} data-rise={share.status === firstStatus ? undefined : true}>
                    {view.message}
                  </Sentence>
                ) : null}
                {paypalReturn.holdId ? <HoldId>Hold {paypalReturn.holdId}</HoldId> : null}
                <FormError error={paypalReturn.error} />
                {view.action ? <HoldButton shareId={share.share_id} action={view.action} /> : null}
              </>
            )}
          </Act>
        </Column>
      </Body>
    </>
  );
}

/**
 * The label with PayPal's own wordmark in place of its last word, "PayPal". The image's alt text keeps the button's
 * name the same for screen readers ("Hold my share with PayPal").
 */
function withPayPalMark(label: string): ReactNode {
  const lead = label.replace(/PayPal$/, "");
  if (lead === label) return label;
  return (
    <WithMark>
      {lead}
      {/* PayPal's wordmark, unmodified, from its brand CDN (ui.md, PayPal). next/image adds nothing for an SVG. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/paypal-color.svg" alt="PayPal" width={71} height={20} />
    </WithMark>
  );
}

interface HoldButtonProps {
  shareId: string;
  action: NonNullable<PayView["action"]>;
}

/** Asks the server for the PayPal link, then leaves for it. A second press gets the same link, never a new order. */
function HoldButton({ shareId, action }: HoldButtonProps) {
  const [checkout, { data, error, isLoading }] = useCheckoutMutation();
  const [sync, { isLoading: syncing }] = useSyncMutation();
  const [leaving, setLeaving] = useState(false);

  // Back from PayPal can bring this page out of the browser's cache with the button still busy.
  useEffect(() => {
    const ready = () => setLeaving(false);
    window.addEventListener("pageshow", ready);
    return () => window.removeEventListener("pageshow", ready);
  }, []);

  // An earlier checkout with no clear result blocks a new one, so ask PayPal once and try again.
  const hold = async () => {
    let answer = await checkout(shareId);
    if (errorCode(answer.error) === "money_unknown") {
      await sync({ shareId });
      answer = await checkout(shareId);
    }
    if (!answer.data?.approve_url) return;
    setLeaving(true);
    leaveFor(answer.data.approve_url);
  };

  return (
    <>
      <Button variant="sun" block loading={isLoading || syncing || leaving} onClick={() => void hold()}>
        {withPayPalMark(action.label)}
      </Button>
      <Help>{action.help}</Help>
      {data?.outcome === "unknown" ? <Help>{UNCLEAR_RESULT}</Help> : null}
      <FormError error={error} />
    </>
  );
}
