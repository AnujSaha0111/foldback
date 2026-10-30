import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Page } from "@/components/Page";
import { Inner } from "@/components/Page/styled";
import { SessionPreview } from "@/features/auth/components/SessionPreview";
import { Section } from "@/features/landing/styled";

export const metadata: Metadata = { title: "Plans" };

export default function PlansPage() {
  return (
    <Page header={<Header>{null}</Header>}>
      <Section>
        <Inner>
          <SessionPreview />
        </Inner>
      </Section>
    </Page>
  );
}
