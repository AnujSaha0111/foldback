"use client";

import { useGetShareQuery } from "@/api/sharesApi";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { Header } from "@/components/Header";
import { Page } from "@/components/Page";
import { Squares } from "@/components/Squares";
import { StatusTag } from "@/components/StatusTag";
import { formatMoney } from "@/lib/format";
import { SHARE_STATUS_VIEW } from "@/lib/status";
import { useShareLive } from "@/sockets/useShareLive";
import type { PublicShare } from "@/types/generated/api-types";
import { conditionText, payView, withOthers } from "../../payView";
import { Act, Amount, Band, Body, Column, Help, Lead, Message, Others, Panel, Row, Who } from "./styled";

/** The page a friend opens from a pay link. Mobile first, one column, and no scroll scenes. */
export function PayScreen({ shareId }: { shareId: string }) {
  const pollingInterval = useShareLive(shareId);
  const { data, error } = useGetShareQuery(shareId, { pollingInterval });
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
        <Share share={data} />
      ) : (
        <Column>
          <FormError error={error} />
        </Column>
      )}
    </Page>
  );
}

function Share({ share }: { share: PublicShare }) {
  const view = payView(share);
  const others = withOthers(share.other_names);
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
              <StatusTag view={SHARE_STATUS_VIEW[share.status]} />
            </Row>
            {others ? <Others>{others}</Others> : null}
          </Panel>
          <Act aria-live="polite">
            {view.message ? <Sentence>{view.message}</Sentence> : null}
            {view.action ? (
              <>
                {/* phase 6: calls checkout, then goes to approve_url */}
                <Button variant="sun" block disabled>
                  {view.action.label}
                </Button>
                <Help>{view.action.help}</Help>
              </>
            ) : null}
          </Act>
        </Column>
      </Body>
    </>
  );
}
