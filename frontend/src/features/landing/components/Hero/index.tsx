import { ButtonLink } from "@/components/Button";
import { GuestButton } from "@/features/auth/components/GuestButton";
import { GUEST_NOTE } from "@/features/auth/copy";
import { LiveHolds } from "../LiveHolds";
import { Actions, Copy, Grid, Lead, Note, Root, Title } from "./styled";

export function Hero() {
  return (
    <Root aria-labelledby="hero-title">
      <Grid>
        <Copy>
          <Title id="hero-title">Nobody pays unless the group makes it.</Title>
          <Lead>
            Everyone authorizes a PayPal hold for their share. If the headcount is met by the deadline,
            Foldback captures every hold. If not, it releases them all.
          </Lead>
          <Actions>
            <GuestButton />
            <ButtonLink href="/login" variant="secondary">
              Sign in
            </ButtonLink>
            <ButtonLink href="/signup" variant="link" arrow={false}>
              Create account
            </ButtonLink>
          </Actions>
          <Note>{GUEST_NOTE}</Note>
        </Copy>
        <LiveHolds />
      </Grid>
    </Root>
  );
}
