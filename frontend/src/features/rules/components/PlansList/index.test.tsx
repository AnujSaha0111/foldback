import { render, screen } from "@testing-library/react";
import { useGetContractsQuery } from "@/api/contractsApi";
import { PlansList } from "./index";

jest.mock("@/api/contractsApi");

const answer = (state: object) =>
  jest.mocked(useGetContractsQuery).mockReturnValue(state as ReturnType<typeof useGetContractsQuery>);

const plan = {
  id: "con_1",
  title: "Cabin weekend",
  status: "active",
  money_source: "sample",
  headcount: 4,
  held_count: 3,
};

describe("PlansList", () => {
  it("lists a plan with its status, holds, type and a link to its board", () => {
    answer({ data: [plan] });
    render(<PlansList />);
    expect(screen.getByRole("link", { name: "Cabin weekend" })).toHaveAttribute("href", "/plans/con_1");
    expect(screen.getByText("Collecting")).toBeInTheDocument();
    expect(screen.getByText("3 of 4 held")).toBeInTheDocument();
    expect(screen.getByText("Sample")).toBeInTheDocument();
  });

  it("copes with a plan that has no title or headcount", () => {
    answer({ data: [{ ...plan, title: null, headcount: null, money_source: "sandbox" }] });
    render(<PlansList />);
    expect(screen.getByRole("link", { name: "Untitled plan" })).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Sandbox")).toBeInTheDocument();
  });

  it.each(["extracting", "needs_clarification", "awaiting_confirmation"])(
    "leaves out a %s draft",
    (status) => {
      answer({ data: [{ ...plan, status }] });
      render(<PlansList />);
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    },
  );

  it("shows the API's sentence when the list fails", () => {
    answer({ error: { status: 500, data: { error: "x", message: "Something went wrong." } } });
    render(<PlansList />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
  });
});
