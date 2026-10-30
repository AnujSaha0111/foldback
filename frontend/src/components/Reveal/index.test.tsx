import { act, render, screen } from "@testing-library/react";
import { Reveal } from "./index";

type Notify = (entries: { isIntersecting: boolean }[]) => void;

let notify: Notify = () => undefined;
const disconnect = jest.fn();

beforeEach(() => {
  disconnect.mockClear();
  window.IntersectionObserver = jest.fn((callback: Notify) => {
    notify = callback;
    return { observe: jest.fn(), disconnect };
  }) as unknown as typeof IntersectionObserver;
});

describe("Reveal", () => {
  it("starts hidden and shows once it comes into view", () => {
    render(<Reveal>content</Reveal>);
    const block = screen.getByText("content");
    expect(block).toHaveAttribute("data-in", "false");
    act(() => notify([{ isIntersecting: true }]));
    expect(block).toHaveAttribute("data-in", "true");
    expect(disconnect).toHaveBeenCalled();
  });

  it("waits while it is off screen", () => {
    render(<Reveal>content</Reveal>);
    act(() => notify([{ isIntersecting: false }]));
    expect(screen.getByText("content")).toHaveAttribute("data-in", "false");
  });
});
