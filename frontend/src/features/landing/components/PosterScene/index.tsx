import { PhoneArt } from "./PhoneArt";
import { Art, Root, WordA, WordB, Words } from "./styled";

export function PosterScene() {
  return (
    <Root>
      <Art>
        <PhoneArt />
      </Art>
      <Words>
        <WordA>hold</WordA>
        <span className="sr-only">, </span>
        <WordB>don&apos;t pay</WordB>
      </Words>
    </Root>
  );
}
