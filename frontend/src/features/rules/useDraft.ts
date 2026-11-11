import { useState } from "react";
import { useClientValue } from "@/hooks/useClientValue";
import { readKept as read, writeKept as write } from "@/lib/sessionStore";

/**
 * Text kept in this tab until it has done its job, so Back, a reload or a back gesture does not lose it. Returns the
 * text, a setter that also keeps it, and `forget`, which drops the kept copy and leaves the text on screen.
 */
export function useDraft(key: string): [string, (value: string) => void, () => void] {
  const kept = useClientValue(() => read(key), "");
  const [text, setText] = useState<string | null>(null);
  const set = (value: string) => {
    setText(value);
    write(key, value);
  };
  const forget = () => {
    setText((now) => now ?? kept);
    write(key, "");
  };
  return [text ?? kept, set, forget];
}
