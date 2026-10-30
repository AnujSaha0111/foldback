import { PhoneArt } from "./PhoneArt";
import { Caption, Root, Stage, WordA, WordB, Words } from "./styled";

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
      </Stage>
    </Root>
  );
}
