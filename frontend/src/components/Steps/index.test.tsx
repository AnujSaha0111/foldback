import { render, screen, within } from "@testing-library/react";
import { Steps } from "./index";

const steps = [
  { title: "First", body: "One" },
  { title: "Second", body: "Two" },
];

describe("Steps", () => {
  it("numbers ordered steps", () => {
    render(<Steps steps={steps} ordered />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items[1]).toHaveTextContent("02");
    expect(screen.getByRole("list").tagName).toBe("OL");
  });

  it("uses arrows for a plain list", () => {
    render(<Steps steps={steps} />);
    expect(screen.getByRole("list").tagName).toBe("UL");
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("→");
  });
});
