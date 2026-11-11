/** What this tab kept under `key`, or "" when nothing is kept or storage is off. */
export function readKept(key: string): string {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/** Keeps `value` for this tab; an empty value drops it. */
export function writeKept(key: string, value: string): void {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    // Storage is off (a private window): the value is not kept.
  }
}
