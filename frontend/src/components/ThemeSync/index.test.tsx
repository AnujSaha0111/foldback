import { act, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "@/store";
import { selectThemeMode } from "@/store/themeSlice";
import { THEME_STORAGE_KEY } from "@/theme/initScript";
import { ThemeSync } from "./index";

function mount() {
  const store = makeStore();
  render(
    <Provider store={store}>
      <ThemeSync />
    </Provider>,
  );
  return store;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("ThemeSync", () => {
  it("reads the theme the init script set, and does not overwrite a saved dark with the default", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    document.documentElement.setAttribute("data-theme", "dark");
    const store = mount();
    expect(selectThemeMode(store.getState())).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("falls back to light when nothing is set", () => {
    const store = mount();
    expect(selectThemeMode(store.getState())).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("follows a change made in another tab", () => {
    const store = mount();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "dark" }));
    });
    expect(selectThemeMode(store.getState())).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("ignores other storage keys", () => {
    const store = mount();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "other", newValue: "dark" }));
    });
    expect(selectThemeMode(store.getState())).toBe("light");
  });
});
