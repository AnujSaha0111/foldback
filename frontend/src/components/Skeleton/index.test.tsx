import { render, screen } from "@testing-library/react";
import { Bone, Skeleton } from "./index";

describe("Skeleton", () => {
  it("announces what is loading once and hides the shapes", () => {
    const { container } = render(
      <Skeleton label="Loading your plans…">
        <Bone $w="10rem" />
      </Skeleton>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading your plans…");
    expect(container.querySelector("[aria-hidden='true'] span")).toBeInTheDocument();
  });
});
