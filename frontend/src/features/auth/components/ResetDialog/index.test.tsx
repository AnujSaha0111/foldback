import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useResetDemoMutation } from "@/api/contractsApi";
import { ResetDialog } from "./index";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/api/contractsApi");

function mount(result: object, state: object = {}) {
  const resetDemo = jest.fn().mockResolvedValue(result);
  const onClose = jest.fn();
  jest
    .mocked(useResetDemoMutation)
    .mockReturnValue([resetDemo, state] as unknown as ReturnType<typeof useResetDemoMutation>);
  render(<ResetDialog onClose={onClose} />);
  return { resetDemo, onClose };
}

beforeEach(() => push.mockClear());

describe("ResetDialog", () => {
  it("warns about holds that stay in PayPal before anything happens", () => {
    const { resetDemo } = mount({ data: {} });
    expect(screen.getByRole("dialog", { name: "Reset demo data?" })).toHaveAccessibleDescription(
      /stay there until they are voided or expire/,
    );
    expect(resetDemo).not.toHaveBeenCalled();
  });

  it("does nothing when the organizer keeps their plans", () => {
    const { resetDemo, onClose } = mount({ data: {} });
    fireEvent.click(screen.getByRole("button", { name: "Keep my plans" }));
    expect(onClose).toHaveBeenCalled();
    expect(resetDemo).not.toHaveBeenCalled();
  });

  it("resets, closes and goes to the plans", async () => {
    const { onClose } = mount({ data: { ok: true } });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/plans"));
    expect(onClose).toHaveBeenCalled();
  });

  it("stays open and shows why when the reset is refused", async () => {
    const { onClose } = mount(
      { error: {} },
      { error: { status: 409, data: { error: "x", message: "A sandbox hold is still live." } } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("A sandbox hold is still live.");
    expect(onClose).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
