import { ApiStatus } from "@/components/ApiStatus";
import { Logo } from "@/components/Logo";
import { Page } from "@/components/Page";
import { Hero, HeroInner, Lead, Title } from "./styled";

export default function HomePage() {
  return (
    <Page>
      <Hero>
        <HeroInner>
          <Logo fontSize="1.5rem" />
          <Title>Nobody pays unless the group makes it.</Title>
          <Lead>
            Each friend&apos;s share is a PayPal hold. If enough of them are in by the deadline, every hold is
            kept. If not, every hold is released.
          </Lead>
          <ApiStatus />
        </HeroInner>
      </Hero>
    </Page>
  );
}
