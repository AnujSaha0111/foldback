import { act, renderHook } from "@testing-library/react";
import { useMediaQuery } from "./useMediaQuery";

describe("useMediaQuery", () => {
  it("follows the query as it starts and stops matching", () => {
    let matches = true;
    let notify = () => {};
    window.matchMedia = jest.fn().mockImplementation(() => ({
      get matches() {
        return matches;
      },
      addEventListener: (_type: string, listener: () => void) => {
        notify = listener;
      },
      removeEventListener: jest.fn(),
    }));
    const { result } = renderHook(() => useMediaQuery("(max-width: 599px)"));
    expect(result.current).toBe(true);
    act(() => {
      matches = false;
      notify();
    });
    expect(result.current).toBe(false);
  });
});
