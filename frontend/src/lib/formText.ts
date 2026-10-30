/** A text field from a submitted form. FormData can also hold files, which a text field never does. */
export function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
