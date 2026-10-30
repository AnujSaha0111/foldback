import { Inner } from "@/components/Page/styled";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Root, Row } from "./styled";

export function Footer() {
  return (
    <Root>
      <Inner>
        <Row>
          <span>Foldback runs on PayPal sandbox. No real money moves.</span>
          <ThemeToggle />
        </Row>
      </Inner>
    </Root>
  );
}
