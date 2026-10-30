import { Muted } from "../../styled";
import { Art, Count, Root, Wrap } from "./styled";

export function SquaresScene() {
  return (
    <Root aria-labelledby="squares-title">
      <Wrap>
        <div>
          <h2 id="squares-title">Four people. One deadline.</h2>
          <Muted>Each share is its own hold. The group is complete only when the last square closes.</Muted>
          <Count>3 of 4 held · 1 to go</Count>
        </div>
        <Art
          role="img"
          aria-label="Four squares: three filled for held shares, one outlined for the share still open"
        >
          <i />
          <i />
          <i />
          <i />
        </Art>
      </Wrap>
    </Root>
  );
}
