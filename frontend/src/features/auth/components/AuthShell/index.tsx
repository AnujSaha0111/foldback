import type { ReactNode } from "react";
import { ButtonLink } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { Page } from "@/components/Page";
import { StatusTag } from "@/components/StatusTag";
import { CONTRACT_STATUS_VIEW } from "@/lib/status";
import { GUEST_NOTE } from "../../copy";
import { AuthTabs } from "../AuthTabs";
import { GuestButton } from "../GuestButton";
import { Card, CardHead, CardSum, Column, Mark, Note, Or, Panel, PanelTitle, Root, Top } from "./styled";

interface AuthShellProps {
  children: ReactNode;
}

/** Sign in and create account share everything but the form. */
export function AuthShell({ children }: AuthShellProps) {
  return (
    <Page compactFooter header={null}>
      <Root>
        <Column>
          <Top>
            <Logo href="/" />
            <ButtonLink href="/" variant="link" arrow={false}>
              Back to home
            </ButtonLink>
          </Top>
          <AuthTabs />
          {children}
          <Or>Or</Or>
          <GuestButton variant="sun" block />
          <Note>{GUEST_NOTE}</Note>
        </Column>
        <Panel aria-hidden="true">
          <PanelTitle>
            Three holds in.
            <br />
            One to go.
          </PanelTitle>
          <Mark>
            <i />
            <i />
            <i />
            <i />
          </Mark>
          <Card>
            <CardHead>
              Cabin weekend
              <StatusTag view={CONTRACT_STATUS_VIEW.active} live />
            </CardHead>
            <p>
              This is a hold, not a charge. It&apos;s only taken if all 4 people pay by Fri 6 Nov, 6:00pm PT.
            </p>
            <CardSum>
              <span>
                <i />
                <i />
                <i />
                <i />
              </span>
              3 of 4 held, $240.00 of $320.00
            </CardSum>
          </Card>
        </Panel>
      </Root>
    </Page>
  );
}
