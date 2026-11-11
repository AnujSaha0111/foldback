import type { Metadata } from "next";
import { ButtonLink } from "@/components/Button";
import { MessagePage } from "@/components/Message";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <MessagePage title="That page does not exist.">
      <ButtonLink href="/">Home</ButtonLink>
      <ButtonLink href="/plans" variant="link">
        Your plans
      </ButtonLink>
    </MessagePage>
  );
}
