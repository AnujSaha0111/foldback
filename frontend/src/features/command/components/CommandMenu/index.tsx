"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { useClientValue } from "@/hooks/useClientValue";
import type { PaletteProps } from "./Palette";
import { Key } from "./styled";

// The palette pulls in MUI's modal code, which nobody needs until it opens.
const Palette = dynamic(() => import("./Palette").then((module) => module.Palette));

const isApple = () => /Mac|iPhone|iPad/.test(navigator.userAgent);

/** Ctrl+K, or ⌘K on Apple keyboards, anywhere on an organizer screen opens the palette. So does the Search button. */
export function CommandMenu(actions: Omit<PaletteProps, "onClose">) {
  const [open, setOpen] = useState(false);
  // The server cannot know the keyboard, so it says Ctrl and the browser corrects it after hydration.
  const apple = useClientValue(isApple, false);

  useEffect(() => {
    // Fetch the palette once the page is up, so the first Ctrl+K opens at once and no typed key is lost.
    void import("./Palette");
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey) return;
      event.preventDefault();
      setOpen((now) => !now);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button
        small
        variant="secondary"
        arrow={false}
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => setOpen(true)}
      >
        Search
        <Key aria-hidden="true">{apple ? "⌘K" : "Ctrl K"}</Key>
      </Button>
      {open ? <Palette onClose={() => setOpen(false)} {...actions} /> : null}
    </>
  );
}
