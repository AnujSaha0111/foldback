import { render, screen } from "@testing-library/react";
import { useGetShareQuery } from "@/api/sharesApi";
import { PayScreen } from "./index";

jest.mock("@/api/sharesApi");
jest.mock("@/sockets/useShareLive", () => ({ useShareLive: () => 10_000 }));
jest.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => null }));

const answer = (state: object) =>
  jest.mocked(useGetShareQuery).mockReturnValue(state as ReturnType<typeof useGetShareQuery>);

const share = {
  share_id: "shr_1",
  contract_id: "con_1",
  display_name: "Maya Shah",
  title: "Cabin weekend",
  amount_cents: 8000,
  currency: "USD",
  headcount: 4,
  held_count: 3,
  deadline_at: "2026-11-07T02:00:00.000Z",
  grace_until: null,
  is_grace_subject: false,
  timezone: "America/Los_Angeles",
  demo_now: "2026-11-07T00:00:00.000Z",
  status: "waiting",
  contract_status: "active",
  money_source: "sandbox",
  payable: true,
  other_names: ["Alex Chen", "Sam Ortiz", "Jordan Lee"],
};

describe("PayScreen", () => {
  it("shows the share, the condition and the progress", () => {
    answer({ data: share });
    render(<PayScreen shareId="shr_1" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Cabin weekend");
    expect(screen.getByText("$80.00")).toBeInTheDocument();
    expect(screen.getByText("This is a hold, not a charge.")).toBeInTheDocument();
    expect(screen.getByText("3 of 4 held")).toBeInTheDocument();
    expect(screen.getByText("Maya Shah (you)")).toBeInTheDocument();
    expect(screen.getByText("With Alex Chen, Sam Ortiz, and Jordan Lee")).toBeInTheDocument();
    expect(screen.getByText("Sandbox")).toBeInTheDocument();
  });

  it("keeps the hold button off until checkout exists, and asks the API on the live hook's interval", () => {
    answer({ data: share });
    render(<PayScreen shareId="shr_1" />);
    expect(screen.getByRole("button", { name: /Hold my share with PayPal/ })).toBeDisabled();
    expect(useGetShareQuery).toHaveBeenCalledWith("shr_1", { pollingInterval: 10_000 });
  });

  it("replaces the condition once the plan is over for this person", () => {
    answer({ data: { ...share, status: "kept", payable: false } });
    render(<PayScreen shareId="shr_1" />);
    expect(screen.getByText("Everyone paid. Your share was captured.")).toBeInTheDocument();
    expect(screen.queryByText("This is a hold, not a charge.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /PayPal/ })).not.toBeInTheDocument();
  });

  it("says Sample on a sample plan", () => {
    answer({ data: { ...share, money_source: "sample", payable: false } });
    render(<PayScreen shareId="shr_1" />);
    expect(screen.getByText("Sample")).toBeInTheDocument();
    expect(screen.getByText("This is a sample plan. No PayPal payment is possible.")).toBeInTheDocument();
  });

  it("says it is loading until the share arrives", () => {
    answer({});
    render(<PayScreen shareId="shr_1" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your share…");
  });

  it("shows the API's sentence for a bad link", () => {
    answer({ error: { status: 404, data: { error: "not_found", message: "That link does not exist." } } });
    render(<PayScreen shareId="shr_1" />);
    expect(screen.getByRole("alert")).toHaveTextContent("That link does not exist.");
  });
});
