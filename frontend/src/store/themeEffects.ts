import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { THEME_STORAGE_KEY } from "@/theme/initScript";
import { selectThemeMode, setTheme, toggleTheme } from "./themeSlice";
import type { ThemeMode } from "./themeSlice";

/**
 * The one place the theme leaves the store: the `data-theme` attribute that the CSS reads, and the saved choice.
 * It runs only when an action changes the theme, so the default "light" can never overwrite a saved "dark" on load.
 */
export const themeListener = createListenerMiddleware<{ theme: { mode: ThemeMode } }>();

themeListener.startListening({
  matcher: isAnyOf(setTheme, toggleTheme),
  effect: (_action, api) => {
    const mode = selectThemeMode(api.getState());
    document.documentElement.setAttribute("data-theme", mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Private windows and blocked storage are fine: the choice just lasts until the tab closes.
    }
  },
});
