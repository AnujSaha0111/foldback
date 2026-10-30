import { Back, Fold, Root } from "./styled";

interface LogoProps {
  /** Size in CSS units. Defaults to the 1.25rem the header uses. */
  fontSize?: string;
}

export function Logo({ fontSize }: LogoProps) {
  return (
    <Root role="img" aria-label="Foldback" style={fontSize ? { fontSize } : undefined}>
      <Fold aria-hidden="true">
        Fold<i></i>
      </Fold>
      <Back aria-hidden="true">
        back<i></i>
      </Back>
    </Root>
  );
}
