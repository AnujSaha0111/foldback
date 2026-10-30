import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "@/api/baseApi";
import { themeListener } from "./themeEffects";
import { themeReducer } from "./themeSlice";

/** One store per browser session, made by Providers. Slices hold UI state only. Server data lives in RTK Query. */
export function makeStore() {
  return configureStore({
    reducer: {
      theme: themeReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefault) => getDefault().prepend(themeListener.middleware).concat(baseApi.middleware),
  });
}

type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
