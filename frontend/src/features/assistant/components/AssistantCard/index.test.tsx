import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAskAgentMutation, useMoveClockMutation, useResolvePlanMutation } from "@/api/contractsApi";
import type { AgentResponse, ApiContract, ApiShare } from "@/types/generated/api-types";
import { AssistantCard } from "./index";

jest.mock("@/api/contractsApi");

const ask = jest.fn();
const moveClock = jest.fn();
const resolvePlan = jest.fn();
const onProposed = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  moveClock.mockResolvedValue({ data: {} });
  resolvePlan.mockResolvedValue({ data: {} });
  jest
    .mocked(useAskAgentMutation)
    .mockReturnValue([ask, {}] as unknown as ReturnType<typeof useAskAgentMutation>);
  jest
    .mocked(useMoveClockMutation)
    .mockReturnValue([moveClock, {}] as unknown as ReturnType<typeof useMoveClockMutation>);
  jest
    .mocked(useResolvePlanMutation)
    .mockReturnValue([resolvePlan, {}] as unknown as ReturnType<typeof useResolvePlanMutation>);
});

const contract = {
  id: "con_1",
  status: "active",
  demo_now: "2026-11-07T00:00:00.000Z",
  deadline_at: "2026-11-07T02:00:00.000Z",
} as ApiContract;
const shares = [
  { id: "s1", display_name: "Alex", status: "held", payable: false },
  { id: "s2", display_name: "Maya", status: "waiting", payable: true },
] as ApiShare[];

const reply = (extra: Partial<AgentResponse> = {}): { data: AgentResponse } => ({
  data: { reply: "Here is what happens.", tool_calls: [], proposals: [], drafts: [], ...extra },
});

function mount() {
  render(<AssistantCard contract={contract} shares={shares} onProposed={onProposed} />);
}

describe("AssistantCard", () => {
  it("offers the chips that apply, using the unpaid person's name", () => {
    mount();
    for (const name of [
      "What happens if Maya doesn't pay?",
      "Draft reminders for anyone unpaid",
      "Move to the deadline",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("sends the question and shows the reply with a line per tool used", async () => {
    ask.mockResolvedValue(
      reply({
        tool_calls: [
          { name: "simulate_outcome", summary: "Simulated Mon 9 Nov, 6:00pm PT with Maya unpaid" },
        ],
      }),
    );
    mount();
    fireEvent.click(screen.getByRole("button", { name: "What happens if Maya doesn't pay?" }));
    expect(await screen.findByText("Here is what happens.")).toBeInTheDocument();
    expect(screen.getByText("Simulated Mon 9 Nov, 6:00pm PT with Maya unpaid")).toBeInTheDocument();
    expect(ask).toHaveBeenCalledWith({
      id: "con_1",
      messages: [{ role: "user", content: "What happens if Maya doesn't pay?" }],
    });
  });

  it("marks a proposed clock move, and approving it calls the clock route as the agent's", async () => {
    const proposal = {
      id: "prop_1",
      kind: "move_clock" as const,
      label: "Advance to deadline (Fri 6 Nov, 6:00pm PT)",
      demo_now: "2026-11-07T02:00:00.000Z",
      preview: "If approved: Maya gets until Monday.",
    };
    ask.mockResolvedValue(reply({ proposals: [proposal] }));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Move to the deadline" }));
    expect(await screen.findByText("If approved: Maya gets until Monday.")).toBeInTheDocument();
    expect(onProposed).toHaveBeenLastCalledWith("2026-11-07T02:00:00.000Z");
    expect(moveClock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(moveClock).toHaveBeenCalledWith({
        id: "con_1",
        demoNow: "2026-11-07T02:00:00.000Z",
        viaAgent: true,
      }),
    );
    expect(
      await screen.findByText("Approved: Advance to deadline (Fri 6 Nov, 6:00pm PT)"),
    ).toBeInTheDocument();
    expect(onProposed).toHaveBeenLastCalledWith(null);
  });

  it("dismisses a proposal without calling anything", async () => {
    ask.mockResolvedValue(
      reply({
        proposals: [{ id: "prop_1", kind: "resolve", label: "Resolve now", demo_now: null, preview: "x" }],
      }),
    );
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Move to the deadline" }));
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Resolve now")).not.toBeInTheDocument();
    expect(resolvePlan).not.toHaveBeenCalled();
  });

  it("shows a reminder draft with a copy button", async () => {
    ask.mockResolvedValue(
      reply({
        drafts: [
          {
            share_id: "s2",
            display_name: "Maya",
            text: "Hey Maya https://x/pay/s2",
            pay_url: "https://x/pay/s2",
          },
        ],
      }),
    );
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Draft reminders for anyone unpaid" }));
    expect(await screen.findByText("Reminder for Maya")).toBeInTheDocument();
    expect(screen.getByText("Hey Maya https://x/pay/s2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("asks a typed question and clears the box", async () => {
    ask.mockResolvedValue(reply());
    mount();
    const box = screen.getByRole("textbox", { name: "Ask about this plan" });
    fireEvent.change(box, { target: { value: "Who is left?" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    await screen.findByText("Here is what happens.");
    expect(box).toHaveValue("");
  });

  it("puts a failed question back in the box, so it can be sent again", async () => {
    ask.mockResolvedValue({ error: { status: 503 } });
    mount();
    const box = screen.getByRole("textbox", { name: "Ask about this plan" });
    fireEvent.change(box, { target: { value: "Who is left?" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    await waitFor(() => expect(box).toHaveValue("Who is left?"));
  });
});
