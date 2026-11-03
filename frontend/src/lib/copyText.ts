/**
 * Puts text on the clipboard and says whether it worked. Some browsers refuse the async clipboard (no focus, a policy,
 * an older engine), so the old copy command is the fallback.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    // shortcut: execCommand is deprecated but still the only fallback every browser has; drop it once none needs it.
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  }
}
