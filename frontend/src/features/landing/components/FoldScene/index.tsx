import { Inner } from "@/components/Page/styled";
import { Head, Kept, Pair, Released, Root, Word } from "./styled";

export function FoldScene() {
  return (
    <Root aria-labelledby="fold-title">
      <Inner>
        <Head>
          <h2 id="fold-title">Kept or released. Never in between.</h2>
        </Head>
        <Pair>
          <Kept>
            <Word>Kept</Word>
            <p>Everyone in by the deadline: every hold is captured.</p>
          </Kept>
          <Released>
            <Word>Released</Word>
            <p>Anyone short: every hold is voided and nobody is charged.</p>
          </Released>
        </Pair>
      </Inner>
    </Root>
  );
}
