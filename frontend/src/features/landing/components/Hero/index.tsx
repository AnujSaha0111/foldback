import Link from "next/link";
import { Fragment } from "react";
import type { CSSProperties } from "react";
import { ButtonLink } from "@/components/Button";
import { GuestButton } from "@/features/auth/components/GuestButton";
import { GUEST_NOTE } from "@/features/auth/copy";
import { LiveHolds } from "../LiveHolds";
import { Actions, Copy, Grid, Lead, Light, Note, Root, Title, Trust, Word } from "./styled";

const TITLE = "Nobody pays unless the group makes it.".split(" ");

const TRUST = [
  { text: "A PayPal hold, not a charge", path: "M3 7h10v7H3zM5 7V5a3 3 0 0 1 6 0v2" },
  { text: "Captured only if everyone's in", path: "M2 8.5l4 4 8-9" },
  { text: "Otherwise released", path: "M3 8h10M9 4l4 4-4 4" },
];

export function Hero() {
  return (
    <Root aria-labelledby="hero-title">
      <Light aria-hidden="true" />
      <Grid>
        <Copy>
          <Title id="hero-title">
            {TITLE.map((word, index) => (
              <Fragment key={word}>
                <Word>
                  <span style={{ "--i": index } as CSSProperties}>{word}</span>
                </Word>
                {index < TITLE.length - 1 ? " " : null}
              </Fragment>
            ))}
          </Title>
          <Lead>
            Everyone authorizes a PayPal hold for their share. If the headcount is met by the deadline,
            Foldback captures every hold. If not, it releases them all.
          </Lead>
          <Actions>
            <GuestButton variant="sun" />
            <ButtonLink href="/login" variant="secondary" arrow={false}>
              Sign in
            </ButtonLink>
          </Actions>
          <Note>
            {GUEST_NOTE} New here? <Link href="/signup">Create account</Link>
          </Note>
          <Trust aria-label="How your money is treated">
            {TRUST.map((item) => (
              <li key={item.text}>
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d={item.path} />
                </svg>
                {item.text}
              </li>
            ))}
          </Trust>
        </Copy>
        <LiveHolds />
      </Grid>
    </Root>
  );
}
