"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setTheme } from "@/store/themeSlice";
import type { ThemeMode } from "@/store/themeSlice";
import { THEME_STORAGE_KEY } from "@/theme/initScript";

const asMode = (value: string | null | undefined): ThemeMode => (value === "dark" ? "dark" : "light");

/**
 * Brings the theme into the store after mount. The init script already set `data-theme` before paint, so this
 * reads that attribute, then follows changes made in other tabs. Writing back is the store's job (themeEffects).
 */
export function ThemeSync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setTheme(asMode(document.documentElement.getAttribute("data-theme"))));
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) dispatch(setTheme(asMode(event.newValue)));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [dispatch]);

  return null;
}
