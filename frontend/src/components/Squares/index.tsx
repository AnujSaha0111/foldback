import { Root } from "./styled";

interface SquaresProps {
  total: number;
  /** How many are filled, from the left. */
  on: number;
}

/** One square per person: blue once held, an orange outline until then. Always beside the same count in words. */
export function Squares({ total, on }: SquaresProps) {
  return (
    <Root aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <i key={index} data-on={index < on} />
      ))}
    </Root>
  );
}
