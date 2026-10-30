import { GuestButton } from "@/features/auth/components/GuestButton";
import { Root, Row } from "./styled";

export function CallToAction() {
  return (
    <Root>
      <Row>
        <h2>Try the cabin trip in two minutes.</h2>
        <GuestButton />
      </Row>
    </Root>
  );
}
