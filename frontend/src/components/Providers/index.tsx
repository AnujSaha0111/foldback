"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import { ThemeSync } from "@/components/ThemeSync";
import { makeStore } from "@/store";
import { theme } from "@/theme/theme";

interface ProvidersProps {
  children: ReactNode;
}

/** Everything a client component may need: the store, Emotion's server cache, the MUI theme, and theme syncing. */
export function Providers({ children }: ProvidersProps) {
  // One store per browser session, created once. A module-level store would be shared between server requests.
  const [store] = useState(makeStore);
  return (
    <Provider store={store}>
      <AppRouterCacheProvider>
        <ThemeProvider theme={theme}>
          <ThemeSync />
          {children}
        </ThemeProvider>
      </AppRouterCacheProvider>
    </Provider>
  );
}
