import type { Metadata } from "next";
import { ButtonLink } from "@/components/Button";
import { Header } from "@/components/Header";
import { Page } from "@/components/Page";
import { Inner } from "@/components/Page/styled";
import { PrivacyNotice } from "@/features/legal/components/PrivacyNotice";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Foldback stores, which AI providers read your text, and how long anything is kept.",
};

export default function PrivacyPage() {
  return (
    <Page
      header={
        <Header>
          <ButtonLink href="/" variant="link" arrow={false}>
            Back to home
          </ButtonLink>
        </Header>
      }
    >
      <Inner>
        <PrivacyNotice />
      </Inner>
    </Page>
  );
}
