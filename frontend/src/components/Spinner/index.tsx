import { Page, Root } from "./styled";

/**
 * Foldback's spinner: three squares held and one still to go, turning a quarter at a time. It takes the colour of the
 * text around it, so it works on every button. Decorative: the words beside it say what is happening.
 */
export function Spinner() {
  return (
    <Root viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="6" height="6" />
      <rect x="9" y="1" width="6" height="6" />
      <rect x="9" y="9" width="6" height="6" />
      <rect data-open x="1.75" y="9.75" width="4.5" height="4.5" />
    </Root>
  );
}

/** The spinner in brand colours with a line of text, for when a screen or a section is waiting on data. */
export function Loading({ label }: { label: string }) {
  return (
    <Page role="status">
      <Spinner />
      {label}
    </Page>
  );
}
