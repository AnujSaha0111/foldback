import { Logo } from "@/components/Logo";
import { Inner } from "@/components/Page/styled";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FooterLink, Note, Root, Row } from "./styled";

interface FooterProps {
  compact?: boolean;
}

export function Footer({ compact = false }: FooterProps) {
  return (
    <Root>
      <Inner>
        <Row>
          {compact ? null : <Logo href="/" />}
          <Note>Sandbox only: no real money moves.</Note>
          <FooterLink href="/privacy">Privacy</FooterLink>
          <ThemeToggle />
        </Row>
      </Inner>
    </Root>
  );
}
