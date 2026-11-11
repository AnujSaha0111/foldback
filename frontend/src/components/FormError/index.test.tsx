import { render, screen } from "@testing-library/react";
import { FormError } from "./index";

describe("FormError", () => {
  it("keeps an empty alert region without an error, so a later message is announced", () => {
    render(<FormError error={undefined} />);
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("shows nothing for a lapsed session, which the header handles", () => {
    render(
      <FormError
        error={{ status: 401, data: { error: "unauthenticated", message: "Sign in to continue." } }}
      />,
    );
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("announces the API's message", () => {
    render(
      <FormError error={{ status: 401, data: { error: "x", message: "Email or password is incorrect." } }} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Email or password is incorrect.");
  });
});
