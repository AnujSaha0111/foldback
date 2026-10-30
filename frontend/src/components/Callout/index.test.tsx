import { render, screen } from "@testing-library/react";
import { Callout } from "./index";

describe("Callout", () => {
  it("shows its title and body", () => {
    render(<Callout title="Heads up">Body text</Callout>);
    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });

  it("does not pass its look prop to the page", () => {
    const { container } = render(
      <Callout title="Heads up" warn>
        Body
      </Callout>,
    );
    expect(container.firstElementChild?.getAttributeNames().some((name) => name.startsWith("$"))).toBe(false);
  });
});
