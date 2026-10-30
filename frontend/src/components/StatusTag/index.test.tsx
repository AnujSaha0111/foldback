import { render, screen } from "@testing-library/react";
import { CONTRACT_STATUS_VIEW, SHARE_STATUS_VIEW } from "@/lib/status";
import { StatusTag } from "./index";

describe("StatusTag", () => {
  it("shows the word, so colour is never the only signal", () => {
    render(<StatusTag view={SHARE_STATUS_VIEW.held} />);
    expect(screen.getByText("Held")).toBeInTheDocument();
  });

  it("reads contract statuses the same way", () => {
    render(<StatusTag view={CONTRACT_STATUS_VIEW.grace} />);
    expect(screen.getByText("In grace")).toBeInTheDocument();
  });

  it("does not pass its look prop to the page", () => {
    render(<StatusTag view={SHARE_STATUS_VIEW.released} />);
    const tag = screen.getByText("Released");
    for (const name of tag.getAttributeNames()) expect(name.startsWith("$")).toBe(false);
  });
});
