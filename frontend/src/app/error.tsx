"use client";

import { Button } from "@/components/Button";
import { Header } from "@/components/Header";
import { Page } from "@/components/Page";
import { Inner } from "@/components/Page/styled";
import { Message } from "@/components/Message";

/** A crash inside a page. The layout still renders, so the header and footer stay. Nothing about money changed. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Page header={<Header>{null}</Header>}>
      <Inner>
        <Message title="Something went wrong on this page.">
          <p>Nothing was charged and no hold changed. Reload to try again.</p>
          <Button onClick={() => reset()}>Reload</Button>
        </Message>
      </Inner>
    </Page>
  );
}
