import { safeNext } from "./safeNext";

describe("safeNext", () => {
  it("follows a path on this site, with its query", () => {
    expect(safeNext("/plans/abc?tab=board")).toBe("/plans/abc?tab=board");
  });

  it("falls back to the plans page when there is nothing", () => {
    expect(safeNext(null)).toBe("/plans");
    expect(safeNext("")).toBe("/plans");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "/\t/evil.example",
    "/\n/evil.example",
    "\t//evil.example",
    "/..//evil.example",
    "/.//evil.example",
    "/a/..//evil.example",
    "/.\\/evil.example",
  ])("refuses %j", (next) => {
    expect(safeNext(next)).toBe("/plans");
  });

  it("keeps a query and a fragment", () => {
    expect(safeNext("/plans?from=login#top")).toBe("/plans?from=login#top");
  });
});
