import { fireEvent, render, screen } from "@testing-library/react";
import { NavMenu } from "./index";

function mount() {
  render(
    <NavMenu
      links={[
        {
          key: "how",
          render: (close) => (
            <a href="#how" onClick={close}>
              How
            </a>
          ),
        },
      ]}
      actions={<button>Act</button>}
    />,
  );
  return screen.getByRole("button", { name: "Menu" });
}

describe("NavMenu", () => {
  it("starts closed and opens from the menu button", () => {
    const toggle = mount();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { hidden: true })).toHaveAttribute("data-open", "true");
  });

  it("closes when a link is followed", () => {
    const toggle = mount();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByText("How"));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
