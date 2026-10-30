import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useGuestMutation } from "@/api/authApi";
import { GuestButton } from "./index";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/api/authApi");

const hook = jest.mocked(useGuestMutation);

function answer(result: object, state: object = {}) {
  const start = jest.fn().mockResolvedValue(result);
  hook.mockReturnValue([start, state] as unknown as ReturnType<typeof useGuestMutation>);
  return start;
}

beforeEach(() => push.mockClear());

describe("GuestButton", () => {
  it("starts a guest workspace and goes to the plans", async () => {
    const start = answer({ data: { user: {} } });
    render(<GuestButton />);
    fireEvent.click(screen.getByRole("button", { name: "Try it as a guest" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/plans"));
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("stays put when the request fails, and shows why", async () => {
    answer(
      { error: {} },
      { error: { status: 429, data: { error: "x", message: "Too many guest sessions." } } },
    );
    render(<GuestButton />);
    fireEvent.click(screen.getByRole("button", { name: "Try it as a guest" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("Too many guest sessions.");
    expect(push).not.toHaveBeenCalled();
  });

  it("is disabled while the request is in flight", () => {
    answer({}, { isLoading: true });
    render(<GuestButton />);
    expect(screen.getByRole("button", { name: "Starting…" })).toBeDisabled();
  });
});
