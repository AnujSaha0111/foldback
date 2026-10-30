import { selectThemeMode, setTheme, themeReducer, toggleTheme } from "./themeSlice";

describe("themeSlice", () => {
  it("starts light", () => {
    expect(themeReducer(undefined, { type: "init" }).mode).toBe("light");
  });

  it("sets a mode", () => {
    expect(themeReducer(undefined, setTheme("dark")).mode).toBe("dark");
  });

  it("toggles both ways", () => {
    const dark = themeReducer(undefined, toggleTheme());
    expect(dark.mode).toBe("dark");
    expect(themeReducer(dark, toggleTheme()).mode).toBe("light");
  });

  it("selects the mode", () => {
    expect(selectThemeMode({ theme: { mode: "dark" } })).toBe("dark");
  });
});
