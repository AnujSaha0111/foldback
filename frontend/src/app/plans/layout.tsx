import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Page } from "@/components/Page";
import { AppHeader } from "@/features/auth/components/AppHeader";
import { Workspace } from "./styled";

export const metadata: Metadata = { title: "Plans" };

export default function PlansLayout({ children }: { children: ReactNode }) {
  return (
    <Page compactFooter header={<AppHeader />}>
      <Workspace>{children}</Workspace>
    </Page>
  );
}
