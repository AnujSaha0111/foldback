import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMoveClockMutation, useResolvePlanMutation } from "@/api/contractsApi";
import { useSyncMutation } from "@/api/sharesApi";
import type { ApiContract, ApiShare } from "@/types/generated/api-types";
import { Controls } from "./index";

jest.mock("@/api/contractsApi");
jest.mock("@/api/sharesApi");

const moveClock = jest.fn();
const resolvePlan = jest.fn();
const sync = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  resolvePlan.mockResolvedValue({ data: {} });
  sync.mockResolvedValue({ data: {} });
  jest
    .mocked(useMoveClockMutation)
    .mockReturnValue([moveClock, {}] as unknown as ReturnType<typeof useMoveClockMutation>);
  jest
    .mocked(useResolvePlanMutation)
    .mockReturnValue([resolvePlan, {}] as unknown as ReturnType<typeof useResolvePlanMutation>);
  jest.mocked(useSyncMutation).mockReturnValue([sync, {}] as unknown as ReturnType<typeof useSyncMutation>);
});

const contract = (extra: Partial<ApiContract> = {}) =>
  ({
    id: "con_1",
    status: "active",
    timezone: "America/Los_Angeles",
    deadline_at: "2026-11-07T02:00:00.000Z",
    grace_until: "2026-11-10T02:00:00.000Z",
    resolution_reason: null,
    ...extra,
  }) as ApiContract;

const share = (id: string, status: ApiShare["status"]) => ({ id, status }) as ApiShare;

describe("Controls", () => {
  it("moves the clock to the deadline and to grace end, saying where to", () => {
    render(<Controls contract={contract()} shares={[]} />);
    expect(screen.getByText("Moves Now to Fri 6 Nov, 6:00pm PT")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Advance to deadline" }));
    expect(moveClock).toHaveBeenCalledWith({ id: "con_1", demoNow: "2026-11-07T02:00:00.000Z" });
    fireEvent.click(screen.getByRole("button", { name: "Advance to grace end" }));
    expect(moveClock).toHaveBeenCalledWith({ id: "con_1", demoNow: "2026-11-10T02:00:00.000Z" });
  });

  it("resolves now", () => {
    render(<Controls contract={contract()} shares={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Resolve now" }));
    expect(resolvePlan).toHaveBeenCalledWith("con_1");
  });

  it("offers no grace move without grace, and nothing once the plan is decided", () => {
    const { rerender } = render(<Controls contract={contract({ grace_until: null })} shares={[]} />);
    expect(screen.getByRole("button", { name: "Advance to grace end" })).toBeDisabled();
    rerender(<Controls contract={contract({ status: "kept" })} shares={[]} />);
    for (const name of ["Advance to deadline", "Advance to grace end", "Resolve now"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
  });

  it("checks each unclear payment, then resolves", async () => {
    const shares = [share("s1", "held"), share("s2", "capture_unknown"), share("s3", "void_unknown")];
    render(<Controls contract={contract({ status: "blocked" })} shares={shares} />);
    expect(screen.getByText(/A PayPal result is unknown/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Check payment" }));
    await waitFor(() => expect(resolvePlan).toHaveBeenCalledWith("con_1"));
    expect(sync.mock.calls).toEqual([[{ shareId: "s2" }], [{ shareId: "s3" }]]);
  });

  it("shows the reason and no button when PayPal refused a capture", () => {
    const reason = "PayPal refused to capture A's share, so Foldback paused. Nothing else was sent.";
    render(
      <Controls
        contract={contract({ status: "blocked", resolution_reason: reason })}
        shares={[share("s1", "capture_failed")]}
      />,
    );
    expect(screen.getByText(reason)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check payment" })).not.toBeInTheDocument();
  });
});
