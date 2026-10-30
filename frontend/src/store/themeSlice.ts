import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
}

/** Light is the default. The saved choice is read in after mount (see ThemeSync), so the server and browser agree. */
const initialState: ThemeState = { mode: "light" };

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
    },
    toggleTheme(state) {
      state.mode = state.mode === "dark" ? "light" : "dark";
    },
  },
  selectors: {
    selectThemeMode: (state) => state.mode,
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export const { selectThemeMode } = themeSlice.selectors;
export const themeReducer = themeSlice.reducer;
