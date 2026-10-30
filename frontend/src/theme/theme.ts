import { createTheme } from "@mui/material/styles";
import type { Shadows } from "@mui/material/styles";

/**
 * The MUI theme. Colours are not set here: every component reads the CSS variables in tokens.css, so the light and
 * dark themes switch with one attribute and there is one source for the look. This only removes MUI's own shape and
 * shadow, gives it the font, and points its surfaces (and the dialog's depth) at the same tokens.
 */
export const theme = createTheme({
  shape: { borderRadius: 0 },
  shadows: Array<string>(25).fill("none") as Shadows,
  typography: { fontFamily: "var(--font-sans)" },
  components: {
    // MUI's own surfaces would stay light in dark mode, under buttons that follow the tokens.
    MuiPaper: { styleOverrides: { root: { backgroundColor: "var(--bg)", color: "var(--text)" } } },
    MuiDialogContentText: { styleOverrides: { root: { color: "var(--text-2)" } } },
    // The one surface that floats: softer corners and the deepest shadow, over a blurred navy backdrop.
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: "var(--r-panel-lg)", boxShadow: "var(--shadow-4)" },
      },
    },
    MuiBackdrop: {
      styleOverrides: { root: { backgroundColor: "rgba(0, 12, 51, 0.38)", backdropFilter: "blur(6px)" } },
    },
  },
});
