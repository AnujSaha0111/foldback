import { createTheme } from "@mui/material/styles";
import type { Shadows } from "@mui/material/styles";

/**
 * The MUI theme. Colours are not set here: every component reads the CSS variables in tokens.css, so the light and
 * dark themes switch with one attribute and there is one source for the look. This only removes MUI's own shape and
 * shadow, gives it the font (radius 0, no shadows, docs/spec/ui.md), and points its surfaces at the same tokens.
 */
export const theme = createTheme({
  shape: { borderRadius: 0 },
  shadows: Array<string>(25).fill("none") as Shadows,
  typography: { fontFamily: "var(--font-sans)" },
  components: {
    // MUI's own surfaces would stay light in dark mode, under buttons that follow the tokens.
    MuiPaper: { styleOverrides: { root: { backgroundColor: "var(--bg)", color: "var(--text)" } } },
    MuiDialogContentText: { styleOverrides: { root: { color: "var(--text-2)" } } },
  },
});
