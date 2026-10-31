import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { Inner } from "@/components/Page/styled";
import { Bar, Root } from "./styled";

interface HeaderProps {
  /** What sits to the right of the logo. */
  children: ReactNode;
}

/** The floating bar every page starts with. The logo lives here, never on the sky hero, where its sky block would vanish. */
export function Header({ children }: HeaderProps) {
  return (
    <Root>
      <Inner>
        <Bar>
          <Logo href="/" />
          {children}
        </Bar>
      </Inner>
    </Root>
  );
}
