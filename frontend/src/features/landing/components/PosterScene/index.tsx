import { PhoneArt } from "./PhoneArt";
import { Caption, Outcome, Root, Stage, WordA, WordB, Words } from "./styled";

export function PosterScene() {
  return (
    <Root>
      <Stage>
        <Words>
          <WordA>hold</WordA>
          <span className="sr-only">, </span>
          <WordB>don&apos;t pay</WordB>
        </Words>
        <PhoneArt />
        <Caption>Each friend opens a link on their phone and approves a PayPal hold. No card form.</Caption>
        <Outcome>Captured only if everyone is in. If not, every hold is released and nobody pays.</Outcome>
      </Stage>
    </Root>
  );
}
