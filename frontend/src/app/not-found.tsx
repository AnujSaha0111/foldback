import type { Metadata } from "next";
import { ButtonLink } from "@/components/Button";
import { Header } from "@/components/Header";
import { Page } from "@/components/Page";
import { Inner } from "@/components/Page/styled";
import { Message } from "@/components/Message";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <Page header={<Header>{null}</Header>}>
      <Inner>
        <Message title="That page does not exist.">
          <ButtonLink href="/">Home</ButtonLink>
          <ButtonLink href="/plans" variant="link">
            Your plans
          </ButtonLink>
        </Message>
      </Inner>
    </Page>
  );
}
