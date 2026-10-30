import { Logo } from "@/components/Logo";
import { Inner } from "@/components/Page/styled";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Note, Root, Row } from "./styled";

interface FooterProps {
  compact?: boolean;
}

export function Footer({ compact = false }: FooterProps) {
  return (
    <Root>
      <Inner>
        <Row>
          {compact ? null : <Logo href="/" />}
          <Note>
            {compact
              ? "Sandbox only: no real money moves."
              : "Built for the PayPal AI hackathon. Sandbox only: no real money moves."}
          </Note>
          <ThemeToggle />
        </Row>
      </Inner>
    </Root>
  );
}
