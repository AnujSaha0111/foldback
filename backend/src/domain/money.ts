// A price counts as written only with a currency marker: $80, 80.00, 80 dollars, 80 USD, 80 bucks.
// A bare 80 does not count, so a headcount such as "4 people" cannot pass for a $4 price.
const MARKED_AMOUNT =
  /(?:\$\s*(\d[\d,]*)(?:\.(\d{1,2}))?)|(?:\b(\d[\d,]*)\.(\d{2})\b)|(?:\b(\d[\d,]*)(?:\.(\d{1,2}))?\s*(?:dollars?|usd|bucks)\b)/gi;

function toCents(whole: string | undefined, fraction: string | undefined): number | null {
  if (whole === undefined) return null;
  const dollars = Number(whole.replaceAll(",", ""));
  if (!Number.isSafeInteger(dollars)) return null;
  return dollars * 100 + Number((fraction ?? "").padEnd(2, "0") || 0);
}

/** Every price written in the text, in integer cents. */
function amountsInText(text: string): number[] {
  const found: number[] = [];
  for (const match of text.matchAll(MARKED_AMOUNT)) {
    const cents = toCents(match[1], match[2]) ?? toCents(match[3], match[4]) ?? toCents(match[5], match[6]);
    if (cents !== null) found.push(cents);
  }
  return found;
}

export function textStatesAmount(text: string, cents: number): boolean {
  return amountsInText(text).includes(cents);
}
