import { fireEvent, render, screen } from "@testing-library/react";
import { Button, ButtonLink } from "./index";

describe("Button", () => {
  it("shows its label with an arrow, and the arrow is hidden from screen readers", () => {
    render(<Button>Read the plan</Button>);
    const button = screen.getByRole("button", { name: "Read the plan" });
    expect(button).toHaveTextContent("Read the plan→");
    expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it("can drop the arrow", () => {
    render(<Button arrow={false}>Answer</Button>);
    expect(screen.getByRole("button", { name: "Answer" })).not.toHaveTextContent("→");
  });

  it("is a plain button by default, so it never submits a form by accident", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute("type", "button");
  });

  it("calls onClick, and not when disabled", () => {
    const onClick = jest.fn();
    const { rerender } = render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Button onClick={onClick} disabled>
        Go
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not pass its look props to the page", () => {
    render(
      <Button variant="blue" small block>
        Go
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Go" });
    for (const name of button.getAttributeNames()) expect(name.startsWith("$")).toBe(false);
  });
});

describe("ButtonLink", () => {
  it("is a link to where it goes", () => {
    render(<ButtonLink href="/login">Sign in</ButtonLink>);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });
});
