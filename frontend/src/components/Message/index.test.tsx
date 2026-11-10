import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { Message } from "./index";

describe("Message", () => {
  it("shows the title as the page heading and the ways out", () => {
    render(
      <Message title="That page does not exist.">
        <Link href="/">Home</Link>
      </Message>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "That page does not exist." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  });
});
