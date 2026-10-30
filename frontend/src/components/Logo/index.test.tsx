import { render, screen } from "@testing-library/react";
import { Logo } from "./index";

describe("Logo", () => {
  it("is announced as one name, Foldback", () => {
    render(<Logo />);
    expect(screen.getByRole("img", { name: "Foldback" })).toBeInTheDocument();
  });

  it("shows both blocks as text, and hides them from screen readers so the name is not read twice", () => {
    render(<Logo />);
    const logo = screen.getByRole("img", { name: "Foldback" });
    expect(logo).toHaveTextContent("Foldback");
    expect(logo.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  it("can be sized", () => {
    render(<Logo fontSize="3rem" />);
    expect(screen.getByRole("img", { name: "Foldback" })).toHaveStyle({ fontSize: "3rem" });
  });
});
