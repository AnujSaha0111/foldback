"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectThemeMode, toggleTheme } from "@/store/themeSlice";
import { Toggle } from "./styled";

/** The label names what a press does, as in the design. */
export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const dark = useAppSelector(selectThemeMode) === "dark";
  return (
    <Toggle type="button" onClick={() => dispatch(toggleTheme())}>
      {dark ? "Light theme" : "Dark theme"}
    </Toggle>
  );
}
