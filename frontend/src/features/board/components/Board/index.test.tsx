import { fireEvent, render, screen } from "@testing-library/react";
import { useGetContractQuery } from "@/api/contractsApi";
import { Board } from "./index";

jest.mock("@/api/contractsApi");
jest.mock("@/sockets/useContractLive", () => ({ useContractLive: () => 0 }));
// Bryntum is a browser-only library; the panel is tested on its own. This stand-in only reports a selection.
jest.mock("../SchedulerPanel", () => ({
  SchedulerPanel: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <button type="button" onClick={() => onSelect("shr_a")}>
      Pick Alex
    </button>
  ),
}));

const answer = (state: object) =>
  jest.mocked(useGetContractQuery).mockReturnValue(state as ReturnType<typeof useGetContractQuery>);

const share = (id: string, display_name: string, status: string, extra: object = {}) => ({
  id,
  display_name,
  status,
  is_grace_subject: false,
  amount_cents: 8000,
  money_source: "sandbox",
  sample_label: null,
  order_id: null,
  authorization_id: null,
  authorization_expires_at: null,
  capture_id: null,
  payable: false,
  pay_path: `/pay/${id}`,
  ...extra,
});

const data = {
  contract: {
    id: "con_1",
    title: "Cabin weekend",
    status: "active",
    money_source: "sandbox",
    headcount: 2,
    held_count: 1,
    kept_count: 0,
    released_count: 0,
    total_cents: 16000,
    timezone: "America/Los_Angeles",
    deadline_at: "2026-11-07T02:00:00.000Z",
    demo_now: "2026-11-07T00:00:00.000Z",
    grace_person_name: "Maya Shah",
    grace_until: "2026-11-10T02:00:00.000Z",
    resolution_reason: null,
  },
  shares: [
    share("shr_a", "Alex Chen", "held", { authorization_id: "AUTH-1" }),
    share("shr_m", "Maya Shah", "waiting", { is_grace_subject: true, payable: true }),
  ],
  events: [],
};

describe("Board", () => {
  it("shows the plan and its numbers", () => {
    answer({ data });
    render(<Board id="con_1" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Cabin weekend");
    expect(screen.getByText("Collecting")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 held")).toBeInTheDocument();
  });

  it("asks the API again on the live hook's interval", () => {
    answer({ data });
    render(<Board id="con_1" />);
    expect(useGetContractQuery).toHaveBeenCalledWith("con_1", { pollingInterval: 0 });
  });

  it("starts on the person the plan is waiting on, with their pay link", () => {
    answer({ data });
    render(<Board id="con_1" />);
    expect(screen.getByText("No hold yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open pay link ↗" })).toHaveAttribute("href", "/pay/shr_m");
  });

  it("shows the person picked on the board", () => {
    answer({ data });
    render(<Board id="con_1" />);
    fireEvent.click(screen.getByRole("button", { name: "Pick Alex" }));
    expect(screen.getByText("AUTH-1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy pay link" })).not.toBeInTheDocument();
  });

  it("shows the API's sentence when the plan cannot be loaded", () => {
    answer({ error: { status: 404, data: { error: "x", message: "Plan not found." } } });
    render(<Board id="con_1" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Plan not found.");
  });
});
