import { act, render, screen } from "@testing-library/react";
import { LiveHolds } from "./index";

function setMotion(reduced: boolean) {
  window.matchMedia = jest.fn().mockReturnValue({ matches: reduced });
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("LiveHolds", () => {
  it("keeps the actions outside the labelled example", () => {
    setMotion(false);
    render(
      <LiveHolds>
        <button>Try it</button>
      </LiveHolds>,
    );
    const example = screen.getByRole("group", { name: "Example: Cabin weekend plan" });
    expect(example).not.toContainElement(screen.getByRole("button", { name: "Try it" }));
  });

  it("starts with nobody held", () => {
    setMotion(false);
    render(<LiveHolds>{null}</LiveHolds>);
    expect(screen.getByText("0 of 4 held")).toBeInTheDocument();
    expect(screen.getByText("$0.00 of $320.00")).toBeInTheDocument();
    expect(screen.getAllByText("Waiting")).toHaveLength(4);
  });

  it("brings the holds in one by one and leaves Maya waiting", () => {
    setMotion(false);
    render(<LiveHolds>{null}</LiveHolds>);
    act(() => jest.advanceTimersByTime(900));
    expect(screen.getByText("1 of 4 held")).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(5000));
    expect(screen.getByText("3 of 4 held")).toBeInTheDocument();
    expect(screen.getByText("$240.00 of $320.00")).toBeInTheDocument();
    expect(screen.getAllByText("Held")).toHaveLength(3);
    expect(screen.getAllByText("Waiting")).toHaveLength(1);
  });

  it("skips the wait under reduced motion", () => {
    setMotion(true);
    render(<LiveHolds>{null}</LiveHolds>);
    act(() => jest.advanceTimersByTime(0));
    expect(screen.getByText("3 of 4 held")).toBeInTheDocument();
  });
});
