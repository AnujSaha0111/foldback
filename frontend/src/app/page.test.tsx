import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "@/store";
import HomePage from "./page";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

beforeAll(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: true });
  window.IntersectionObserver = jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
  })) as unknown as typeof IntersectionObserver;
});

function mount() {
  render(
    <Provider store={makeStore()}>
      <HomePage />
    </Provider>,
  );
}

describe("landing page", () => {
  it("leads with the promise, in one h1", () => {
    mount();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Nobody pays unless the group makes it.",
    );
  });

  it("puts the logo in the header, not on the sky hero", () => {
    mount();
    const logos = screen.getAllByRole("link", { name: "Foldback home" });
    expect(logos[0]?.closest("header")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).closest("section")).not.toContainElement(
      logos[0] ?? null,
    );
  });

  it("has every section the menu links to", () => {
    mount();
    for (const id of ["how", "hold", "board"]) expect(document.getElementById(id)).not.toBeNull();
  });

  it("keeps the sandbox promise in the footer", () => {
    mount();
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Sandbox only: no real money moves.");
  });
});
