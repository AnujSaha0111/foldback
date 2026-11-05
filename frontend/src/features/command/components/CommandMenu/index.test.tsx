import { fireEvent, render, screen } from "@testing-library/react";
import { CommandMenu } from "./index";

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () =>
    function MockPalette() {
      return <div>Palette</div>;
    },
}));

const mount = () => render(<CommandMenu onReset={jest.fn()} onSignOut={jest.fn()} />);

describe("CommandMenu", () => {
  it("shows the shortcut on its button and opens from it", () => {
    mount();
    const button = screen.getByRole("button", { name: /Search/ });
    expect(button).toHaveTextContent("Ctrl K");
    expect(button).toHaveAttribute("aria-keyshortcuts", "Control+K Meta+K");
    fireEvent.click(button);
    expect(screen.getByText("Palette")).toBeInTheDocument();
  });

  it("toggles with Ctrl+K or Cmd+K, and ignores K alone", () => {
    mount();
    fireEvent.keyDown(window, { key: "k" });
    expect(screen.queryByText("Palette")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByText("Palette")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "K", metaKey: true });
    expect(screen.queryByText("Palette")).not.toBeInTheDocument();
  });
});
