"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectThemeMode, toggleTheme } from "@/store/themeSlice";
import { Switch, Track } from "./styled";

export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const dark = useAppSelector(selectThemeMode) === "dark";
  return (
    <Switch type="button" role="switch" aria-checked={dark} onClick={() => dispatch(toggleTheme())}>
      <Track $on={dark} aria-hidden="true" />
      Dark theme
    </Switch>
  );
}
