import { Back, Fold, Root, RootLink } from "./styled";

interface LogoProps {
  /** Makes the logo a link, as it is in the header and footer. */
  href?: string;
}

const blocks = (
  <>
    <Fold aria-hidden="true">
      Fold<i></i>
    </Fold>
    <Back aria-hidden="true">
      back<i></i>
    </Back>
  </>
);

export function Logo({ href }: LogoProps) {
  if (href) {
    return (
      <RootLink href={href} aria-label="Foldback home">
        {blocks}
      </RootLink>
    );
  }
  return (
    <Root role="img" aria-label="Foldback">
      {blocks}
    </Root>
  );
}
