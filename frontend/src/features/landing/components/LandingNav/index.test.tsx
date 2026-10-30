import { fireEvent, render, screen } from "@testing-library/react";
import { LandingNav } from "./index";

jest.mock("@/features/auth/components/GuestButton", () => ({ GuestButton: () => <button>Guest</button> }));

describe("LandingNav", () => {
  it("starts closed and opens from the menu button", () => {
    render(<LandingNav />);
    const toggle = screen.getByRole("button", { name: "Menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("closes when a section link is followed", () => {
    render(<LandingNav />);
    const toggle = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByText("How it works"));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("links to the sign-in page", () => {
    render(<LandingNav />);
    expect(screen.getByText("Sign in").closest("a")).toHaveAttribute("href", "/login");
  });
});
