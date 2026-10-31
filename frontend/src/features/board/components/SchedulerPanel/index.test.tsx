import { render, screen } from "@testing-library/react";
import { useGetSchedulerQuery } from "@/api/schedulerApi";
import { SchedulerPanel } from "./index";

jest.mock("@/api/schedulerApi");
// Bryntum is a browser-only library: the stand-in shows what the panel hands it.
jest.mock("./FoldbackScheduler", () => ({
  __esModule: true,
  default: ({ projection }: { projection: { resources: { name: string }[] } }) => (
    <p>{projection.resources.map((resource) => resource.name).join(", ")}</p>
  ),
}));

const answer = (state: object) =>
  jest.mocked(useGetSchedulerQuery).mockReturnValue(state as ReturnType<typeof useGetSchedulerQuery>);

describe("SchedulerPanel", () => {
  it("shows the spinner in the board's place while the data loads", () => {
    answer({});
    render(<SchedulerPanel contractId="con_1" pollingInterval={0} onSelect={jest.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading the board…");
  });

  it("hands the server's projection to the board, polling as told", async () => {
    answer({ data: { resources: [{ name: "Alex Chen" }, { name: "Maya Shah" }] } });
    render(<SchedulerPanel contractId="con_1" pollingInterval={10_000} onSelect={jest.fn()} />);
    expect(await screen.findByText("Alex Chen, Maya Shah")).toBeInTheDocument();
    expect(useGetSchedulerQuery).toHaveBeenCalledWith("con_1", { pollingInterval: 10_000 });
  });

  it("shows the API's sentence when the board cannot be loaded", () => {
    answer({ error: { status: 404, data: { error: "not_found", message: "That plan has no board yet." } } });
    render(<SchedulerPanel contractId="con_1" pollingInterval={0} onSelect={jest.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("That plan has no board yet.");
  });
});
