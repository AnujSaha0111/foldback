const HOME = "/plans";
const THIS_SITE = "http://foldback.invalid";

/**
 * Where to go after sign-in. `?next=` comes from the URL, so anyone can write it: only a path on this site is
 * followed. Browsers quietly clean a URL before using it, so `/<tab>/evil.example` and `/\evil.example` both end up
 * on another site. Asking the URL parser, the same rules a browser uses, catches those. The parser also tidies
 * `/..//evil.example` into `//evil.example`, which is another site once it is handed back, so that is refused too.
 */
export function safeNext(next: string | null): string {
  if (!next?.startsWith("/")) return HOME;
  try {
    const url = new URL(next, THIS_SITE);
    if (url.origin !== THIS_SITE || url.pathname.startsWith("//")) return HOME;
    return url.pathname + url.search + url.hash;
  } catch {
    return HOME;
  }
}
