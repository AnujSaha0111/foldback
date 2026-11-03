"use client";

import { useState } from "react";
import { errorCode } from "@/api/baseApi";
import { useCheckoutMutation, useGetShareQuery, useSyncMutation } from "@/api/sharesApi";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { Header } from "@/components/Header";
import { Page } from "@/components/Page";
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
          <Badge>{data?.money_source === "sample" ? "Sample" : "Sandbox"}</Badge>
        </Header>
      }
    >
      {data ? (
        <Share share={data} paypalReturn={paypalReturn} cancelled={returned.cancelled} />
      ) : (
        <Column>{error ? <FormError error={error} /> : <Loading label="Loading your share…" />}</Column>
      )}
    </Page>
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

interface HoldButtonProps {
  shareId: string;
  action: NonNullable<PayView["action"]>;
}

/** Asks the server for the PayPal link, then leaves for it. A second press gets the same link, never a new order. */
function HoldButton({ shareId, action }: HoldButtonProps) {
  const [checkout, { data, error, isLoading }] = useCheckoutMutation();
  const [sync, { isLoading: syncing }] = useSyncMutation();

  // An earlier checkout with no clear result blocks a new one, so ask PayPal once and try again.
  const hold = async () => {
    let answer = await checkout(shareId);
    if (errorCode(answer.error) === "money_unknown") {
      await sync({ shareId });
      answer = await checkout(shareId);
    }
    if (answer.data?.approve_url) leaveFor(answer.data.approve_url);
  };

  return (
    <>
      <Button variant="sun" block loading={isLoading || syncing} onClick={() => void hold()}>
        {action.label}
      </Button>
      <Help>{action.help}</Help>
      {data?.outcome === "unknown" ? <Help>{UNCLEAR_RESULT}</Help> : null}
      <FormError error={error} />
    </>
  );
}
