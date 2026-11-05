import { act, renderHook } from "@testing-library/react";
import { useDraft } from "./useDraft";

describe("useDraft", () => {
  it("keeps the text for the next visit in this tab", () => {
    const first = renderHook(() => useDraft("k"));
    act(() => first.result.current[1]("Cabin, $600, four of us"));
    first.unmount();
    const again = renderHook(() => useDraft("k"));
    expect(again.result.current[0]).toBe("Cabin, $600, four of us");
  });

  it("forgets the kept copy but leaves the text on screen", () => {
    sessionStorage.setItem("k", "Kept chat");
    const { result } = renderHook(() => useDraft("k"));
    act(() => result.current[2]());
    expect(result.current[0]).toBe("Kept chat");
    expect(sessionStorage.getItem("k")).toBeNull();
  });
});
