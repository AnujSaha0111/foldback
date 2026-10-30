import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "@/store";
import { selectThemeMode } from "@/store/themeSlice";
import { ThemeToggle } from "./index";

function mount() {
  const store = makeStore();
  render(
    <Provider store={store}>
      <ThemeToggle />
    </Provider>,
  );
  return store;
}

describe("ThemeToggle", () => {
  it("offers the dark theme first, because light is the default", () => {
    mount();
    expect(screen.getByRole("button", { name: "Dark theme" })).toBeInTheDocument();
  });

  it("flips the theme in the store and renames itself", () => {
    const store = mount();
    fireEvent.click(screen.getByRole("button", { name: "Dark theme" }));
    expect(selectThemeMode(store.getState())).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Light theme" }));
    expect(selectThemeMode(store.getState())).toBe("light");
  });
});
