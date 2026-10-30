import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Page } from "@/components/Page";
import { BoardPeek } from "@/features/landing/components/BoardPeek";
import { CallToAction } from "@/features/landing/components/CallToAction";
import { Compare } from "@/features/landing/components/Compare";
import { FoldScene } from "@/features/landing/components/FoldScene";
import { Hero } from "@/features/landing/components/Hero";
import { LandingNav } from "@/features/landing/components/LandingNav";
import { PosterScene } from "@/features/landing/components/PosterScene";
import { SquaresScene } from "@/features/landing/components/SquaresScene";
import { AssistantRoles, HowItWorks } from "@/features/landing/components/StepSections";

export const metadata: Metadata = {
  title: { absolute: "Foldback · Nobody pays unless the group makes it" },
};

export default function HomePage() {
  return (
    <Page
      header={
        <Header>
          <LandingNav />
        </Header>
      }
    >
      <Hero />
      <PosterScene />
      <HowItWorks />
      <SquaresScene />
      <Compare />
      <FoldScene />
      <BoardPeek />
      <AssistantRoles />
      <CallToAction />
    </Page>
  );
}
