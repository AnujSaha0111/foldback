import { render, screen } from "@testing-library/react";
import { Field } from "./index";

describe("Field", () => {
  it("ties the label to the input", () => {
    render(<Field label="Email" name="email" type="email" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("name", "email");
  });

  it("ties the helper to the input", () => {
    render(<Field label="Password" type="password" help="At least 10 characters" />);
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription("At least 10 characters");
  });

  it("has no description without a helper", () => {
    render(<Field label="Name" />);
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-describedby");
  });
});
