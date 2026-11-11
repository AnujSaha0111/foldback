import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Page } from "@/components/Page";
import { Inner } from "@/components/Page/styled";
import { Actions, Root } from "./styled";

interface MessageProps {
  title: string;
  /** Text and the ways out (links or buttons). */
  children: ReactNode;
}

/** A page-level message, for "not found" and crashes. */
export function Message({ title, children }: MessageProps) {
  return (
    <Root>
      <h1>{title}</h1>
      <Actions>{children}</Actions>
    </Root>
  );
}

/** A whole page around a message, for routes with nothing else to show. */
export function MessagePage(props: MessageProps) {
  return (
    <Page header={<Header>{null}</Header>}>
      <Inner>
        <Message {...props} />
      </Inner>
    </Page>
  );
}
