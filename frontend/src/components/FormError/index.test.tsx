import { render, screen } from "@testing-library/react";
import { FormError } from "./index";

describe("FormError", () => {
  it("shows nothing without an error", () => {
    const { container } = render(<FormError error={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("announces the API's message", () => {
    render(
      <FormError error={{ status: 401, data: { error: "x", message: "Email or password is incorrect." } }} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Email or password is incorrect.");
  });
});
