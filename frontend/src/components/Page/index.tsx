import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Main, Shell, Skip } from "./styled";

interface PageProps {
  header: ReactNode;
  children: ReactNode;
  /** The short footer the sign-in screens use, without the logo. */
  compactFooter?: boolean;
}

/** The frame every screen sits in: content grows, the footer stays at the bottom. */
export function Page({ header, children, compactFooter = false }: PageProps) {
  return (
    <Shell>
      <Skip href="#main">Skip to content</Skip>
      {header}
      <Main id="main">{children}</Main>
      <Footer compact={compactFooter} />
    </Shell>
  );
}
