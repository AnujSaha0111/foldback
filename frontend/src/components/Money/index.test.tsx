import { render, screen } from "@testing-library/react";
import { Money } from "./index";

describe("Money", () => {
  it("writes cents as dollars", () => {
    render(<Money cents={8000} />);
    expect(screen.getByText("$80.00")).toBeInTheDocument();
  });
});
