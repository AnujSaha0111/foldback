import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Main, Shell } from "./styled";

interface PageProps {
  children: ReactNode;
}

/** The frame every screen sits in: content grows, the footer stays at the bottom. */
export function Page({ children }: PageProps) {
  return (
    <Shell>
      <Main id="main">{children}</Main>
      <Footer />
    </Shell>
  );
}
