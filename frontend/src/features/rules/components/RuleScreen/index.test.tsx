import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  useClarifyRuleMutation,
  useConfirmRuleMutation,
  useReadRuleMutation,
  useResetDemoMutation,
} from "@/api/contractsApi";
import { CABIN_CHAT_TEXT } from "@/types/generated/rules";
import type { ApiExtraction } from "@/types/generated/api-types";
import { RuleScreen } from "./index";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/api/contractsApi");

const extraction: ApiExtraction = {
  title: "Cabin weekend",
  currency: "USD",
  total_cents: 32000,
  share_cents: 8000,
  headcount: 4,
  deadline_at: "2026-11-06T18:00:00-08:00",
  timezone: "America/Los_Angeles",
  grace_person_name: "Maya Shah",
  grace_until: "2026-11-09T18:00:00-08:00",
  people: ["Alex Chen", "Maya Shah"],
  missing: [],
  clarification_question: null,
  evidence: [{ field: "share_cents", quote: "so $80 each" }],
};

const questionError = {
  status: 422,
  data: { error: "needs_clarification", message: "What time on Friday?", contract_id: "con_1", missing: [] },
};

function mockReset(fulfilledTimeStamp?: number) {
  jest
    .mocked(useResetDemoMutation)
    .mockReturnValue([jest.fn(), { fulfilledTimeStamp }] as unknown as ReturnType<
      typeof useResetDemoMutation
    >);
}

function setup({ read = {}, readState = {}, clarify = {}, clarifyState = {} }: Record<string, object> = {}) {
  mockReset();
  const readRule = jest.fn().mockResolvedValue(read);
  const clarifyRule = jest.fn().mockResolvedValue(clarify);
  const confirmRule = jest.fn().mockResolvedValue({ data: {} });
  jest
    .mocked(useReadRuleMutation)
    .mockReturnValue([readRule, readState] as unknown as ReturnType<typeof useReadRuleMutation>);
  jest
    .mocked(useClarifyRuleMutation)
    .mockReturnValue([clarifyRule, { reset: jest.fn(), ...clarifyState }] as unknown as ReturnType<
      typeof useClarifyRuleMutation
    >);
  jest
    .mocked(useConfirmRuleMutation)
    .mockReturnValue([confirmRule, {}] as unknown as ReturnType<typeof useConfirmRuleMutation>);
  const { rerender } = render(<RuleScreen />);
  return { readRule, clarifyRule, confirmRule, rerender };
}

const chatBox = () => screen.getByLabelText("Paste the group chat or describe the plan");

function readText(text: string) {
  fireEvent.change(chatBox(), { target: { value: text } });
  fireEvent.submit(screen.getByRole("button", { name: "Read the plan" }));
}

beforeEach(() => push.mockClear());

describe("RuleScreen", () => {
  it("starts with nothing read", () => {
    setup();
    expect(screen.getByText("Your plan appears here")).toBeInTheDocument();
  });

  it("fills the box with the sample chat", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Use the sample cabin chat" }));
    expect(chatBox()).toHaveValue(CABIN_CHAT_TEXT);
  });

  it("sends the fixed demo date only for the sample text", async () => {
    const { readRule } = setup({ read: { data: { contract_id: "con_1", extraction } } });
    fireEvent.click(screen.getByRole("button", { name: "Use the sample cabin chat" }));
    fireEvent.submit(screen.getByRole("button", { name: "Read the plan" }));
    await screen.findByText("Cabin weekend");
    expect(readRule).toHaveBeenCalledWith({ rule_text: CABIN_CHAT_TEXT, use_fixture_time: true });
  });

  it("sends typed text without the fixed date", async () => {
    const { readRule } = setup({ read: { data: { contract_id: "con_1", extraction } } });
    readText("A trip for four");
    await screen.findByText("Cabin weekend");
    expect(readRule).toHaveBeenCalledWith({ rule_text: "A trip for four" });
  });

  it("lists the terms with their quotes, then confirms exactly what was read", async () => {
    const { confirmRule } = setup({ read: { data: { contract_id: "con_1", extraction } } });
    readText("A trip for four");
    expect(await screen.findByText("“so $80 each”")).toBeInTheDocument();
    expect(screen.getByText("Fri 6 Nov 2026, 6:00pm PST")).toBeInTheDocument();
    expect(screen.getByText("Maya Shah until Mon 9 Nov 2026, 6:00pm PST")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm these terms" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/plans/con_1"));
    expect(confirmRule).toHaveBeenCalledWith({
      id: "con_1",
      terms: expect.objectContaining({ share_cents: 8000, people: ["Alex Chen", "Maya Shah"] }) as object,
    });
  });

  it("says when there is no grace", async () => {
    setup({
      read: {
        data: {
          contract_id: "con_1",
          extraction: { ...extraction, grace_person_name: null, grace_until: null },
        },
      },
    });
    readText("A trip for four");
    expect(await screen.findByText("No grace. Everyone has the same deadline.")).toBeInTheDocument();
  });

  it("asks the server's question, keeps the text, and reads again with the answer", async () => {
    const { clarifyRule } = setup({
      read: { error: questionError },
      clarify: { data: { contract_id: "con_1", extraction } },
    });
    readText("A trip for four");
    expect(await screen.findByText("What time on Friday?")).toBeInTheDocument();
    expect(chatBox()).toHaveValue("A trip for four");
    expect(screen.queryByRole("button", { name: "Confirm these terms" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "6pm" } });
    fireEvent.submit(screen.getByRole("button", { name: "Answer" }));
    await screen.findByRole("button", { name: "Confirm these terms" });
    expect(clarifyRule).toHaveBeenCalledWith({ id: "con_1", answer: "6pm" });
  });

  it("starts again after a demo reset, so nobody can confirm a deleted plan", async () => {
    const { rerender } = setup({ read: { data: { contract_id: "con_1", extraction } } });
    readText("A trip for four");
    await screen.findByRole("button", { name: "Confirm these terms" });
    mockReset(1234);
    rerender(<RuleScreen />);
    expect(screen.queryByRole("button", { name: "Confirm these terms" })).not.toBeInTheDocument();
    expect(screen.getByText("Your plan appears here")).toBeInTheDocument();
    expect(chatBox()).toHaveValue("");
  });

  it("does not show a question as an error", () => {
    setup({ readState: { error: questionError } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the API's sentence for a real failure", () => {
    setup({ readState: { error: { status: 429, data: { error: "x", message: "Please wait a minute." } } } });
    expect(screen.getByRole("alert")).toHaveTextContent("Please wait a minute.");
  });

  it("shows that it is reading and disables the button", () => {
    setup({ readState: { isLoading: true } });
    expect(screen.getByRole("button", { name: "Reading…" })).toBeDisabled();
    expect(
      screen.getByText("Finding the price, the people and the deadline in your text."),
    ).toBeInTheDocument();
  });
});
