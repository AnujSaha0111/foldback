import { render, screen } from "@testing-library/react";
import { Button } from "@/components/Button";
import { Loading } from "./index";

describe("Loading", () => {
  it("says what is loading, and the words are what a screen reader hears", () => {
    render(<Loading label="Loading your plans…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your plans…");
  });
});

describe("Button while loading", () => {
  it("cannot be pressed again, swaps its arrow for the spinner and reports that it is busy", () => {
    render(<Button loading>Starting…</Button>);
    const button = screen.getByRole("button", { name: "Starting…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("svg")).toBeInTheDocument();
    expect(button).not.toHaveTextContent("→");
  });

  it("shows the arrow when it is not loading", () => {
    render(<Button>Start</Button>);
    expect(screen.getByRole("button", { name: "Start" })).toHaveTextContent("→");
    expect(screen.getByRole("button", { name: "Start" })).not.toHaveAttribute("aria-busy");
  });
});
