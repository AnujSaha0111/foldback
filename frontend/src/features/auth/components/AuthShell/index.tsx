import type { ReactNode } from "react";
import { ButtonLink } from "@/components/Button";
import { Header } from "@/components/Header";
import { Page } from "@/components/Page";
import { GUEST_NOTE } from "../../copy";
import { GuestButton } from "../GuestButton";
import { Column, Mark, Note, Or, Panel, PanelTitle, Root } from "./styled";

interface AuthShellProps {
  children: ReactNode;
}

/** Sign in and create account share everything but the form. */
export function AuthShell({ children }: AuthShellProps) {
  return (
    <Page
      compactFooter
      header={
        <Header>
          <ButtonLink href="/" variant="link" arrow={false}>
            Back to home
          </ButtonLink>
        </Header>
      }
    >
      <Root>
        <Column>
          {children}
          <Or>Or</Or>
          <GuestButton variant="secondary" block />
          <Note>{GUEST_NOTE}</Note>
        </Column>
        <Panel aria-hidden="true">
          <PanelTitle>Three holds in. One to go.</PanelTitle>
          <Mark>
            <i />
            <i />
            <i />
            <i />
          </Mark>
        </Panel>
      </Root>
    </Page>
  );
}
