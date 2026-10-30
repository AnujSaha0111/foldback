import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "@/store";
import { selectThemeMode } from "@/store/themeSlice";
import { ThemeToggle } from "./index";

describe("ThemeToggle", () => {
  it("is a labelled switch that starts off, because light is the default", () => {
    render(
      <Provider store={makeStore()}>
        <ThemeToggle />
      </Provider>,
    );
    expect(screen.getByRole("switch", { name: "Dark theme" })).toHaveAttribute("aria-checked", "false");
  });

  it("flips the theme in the store when pressed", () => {
    const store = makeStore();
    render(
      <Provider store={store}>
        <ThemeToggle />
      </Provider>,
    );
    const toggle = screen.getByRole("switch", { name: "Dark theme" });
    fireEvent.click(toggle);
    expect(selectThemeMode(store.getState())).toBe("dark");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(selectThemeMode(store.getState())).toBe("light");
  });
});
