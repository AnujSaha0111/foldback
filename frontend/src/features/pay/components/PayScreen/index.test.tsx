import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  useAuthorizeMutation,
  useCheckoutMutation,
  useGetShareQuery,
  useSyncMutation,
} from "@/api/sharesApi";
import { leaveFor } from "@/lib/leaveFor";
import { PayScreen } from "./index";

jest.mock("@/api/sharesApi");
jest.mock("@/lib/leaveFor");
jest.mock("@/sockets/useShareLive", () => ({ useShareLive: () => 10_000 }));
jest.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => null }));

const refetch = jest.fn();
const answer = (state: object) => jest.mocked(useGetShareQuery).mockReturnValue({ refetch, ...state });

const authorize = jest.fn();
const sync = jest.fn();

const checkout = jest.fn();
const checkoutState = (state: object) =>
  jest
    .mocked(useCheckoutMutation)
    .mockReturnValue([checkout, state] as unknown as ReturnType<typeof useCheckoutMutation>);

const pressHold = () => fireEvent.click(screen.getByRole("button", { name: /Hold my share with PayPal/ }));

beforeEach(() => {
  jest.clearAllMocks();
  checkoutState({});
  jest
    .mocked(useAuthorizeMutation)
    .mockReturnValue([authorize, {}] as unknown as ReturnType<typeof useAuthorizeMutation>);
  sync.mockResolvedValue({ data: {} });
  jest.mocked(useSyncMutation).mockReturnValue([sync, {}] as unknown as ReturnType<typeof useSyncMutation>);
  window.history.replaceState(null, "", "/pay/shr_1?token=O1&PayerID=P1");
});

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

  it("asks the API on the live hook's interval", () => {
    answer({ data: share });
    render(<PayScreen shareId="shr_1" />);
    expect(useGetShareQuery).toHaveBeenCalledWith("shr_1", { pollingInterval: 10_000 });
  });

  it("shows PayPal's own wordmark in the button, named for screen readers", () => {
    answer({ data: share });
    render(<PayScreen shareId="shr_1" />);
    const button = screen.getByRole("button", { name: "Hold my share with PayPal" });
    expect(within(button).getByRole("img", { name: "PayPal" })).toHaveAttribute("src", "/paypal-color.svg");
  });

  it("opens checkout for this share, then leaves for PayPal", async () => {
    answer({ data: share });
    checkout.mockResolvedValue({
      data: { outcome: "completed", order_id: "O1", approve_url: "https://www.sandbox.paypal.com/x" },
    });
    render(<PayScreen shareId="shr_1" />);
    pressHold();
    expect(checkout).toHaveBeenCalledWith("shr_1");
    await waitFor(() => expect(leaveFor).toHaveBeenCalledWith("https://www.sandbox.paypal.com/x"));
  });

  it("stays busy while the browser leaves for PayPal, and is ready again after Back", async () => {
    answer({ data: share });
    checkout.mockResolvedValue({
      data: { outcome: "completed", order_id: "O1", approve_url: "https://www.sandbox.paypal.com/x" },
    });
    render(<PayScreen shareId="shr_1" />);
    pressHold();
    await waitFor(() => expect(leaveFor).toHaveBeenCalled());
    const busy = screen.getByRole("button", { busy: true });
    expect(busy).toBeDisabled();
    act(() => void window.dispatchEvent(new Event("pageshow")));
    expect(busy).toBeEnabled();
  });

  it("stays on the page when PayPal's reply was lost, and says so", async () => {
    answer({ data: share });
    checkout.mockResolvedValue({ data: { outcome: "unknown", order_id: null, approve_url: null } });
    checkoutState({ data: { outcome: "unknown" } });
    render(<PayScreen shareId="shr_1" />);
    pressHold();
    await waitFor(() => expect(checkout).toHaveBeenCalled());
    expect(leaveFor).not.toHaveBeenCalled();
    expect(screen.getByText(/PayPal did not return a clear result/)).toBeInTheDocument();
  });

  it("shows the API's sentence when checkout is refused, and does not leave", async () => {
    answer({ data: share });
    const refused = { status: 409, data: { error: "share_not_payable", message: "Too late." } };
    checkout.mockResolvedValue({ error: refused });
    checkoutState({ error: refused });
    render(<PayScreen shareId="shr_1" />);
    pressHold();
    await waitFor(() => expect(checkout).toHaveBeenCalled());
    expect(screen.getByText("Too late.")).toHaveAttribute("role", "alert");
    expect(leaveFor).not.toHaveBeenCalled();
  });

  it("shows the button as working during the call", () => {
    answer({ data: share });
    checkoutState({ isLoading: true });
    render(<PayScreen shareId="shr_1" />);
    expect(screen.getByRole("button", { name: /Hold my share with PayPal/ })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("asks PayPal once and tries again when an earlier checkout is unclear", async () => {
    answer({ data: { ...share, status: "checkout_open" } });
    const unclear = { error: { status: 409, data: { error: "money_unknown", message: "Unclear." } } };
    const opened = {
      data: { outcome: "completed", order_id: "O2", approve_url: "https://www.sandbox.paypal.com/y" },
    };
    checkout.mockResolvedValueOnce(unclear).mockResolvedValueOnce(opened);
    render(<PayScreen shareId="shr_1" />);
    fireEvent.click(screen.getByRole("button", { name: /Continue in PayPal/ }));
    await waitFor(() => expect(leaveFor).toHaveBeenCalledWith("https://www.sandbox.paypal.com/y"));
    expect(sync).toHaveBeenCalledWith({ shareId: "shr_1" });
    expect(checkout).toHaveBeenCalledTimes(2);
  });

  it("asks PayPal once when the page opens on an unclear hold", async () => {
    answer({ data: { ...share, status: "authorize_unknown", payable: false } });
    const { rerender } = render(<PayScreen shareId="shr_1" />);
    await waitFor(() => expect(sync).toHaveBeenCalledWith({ shareId: "shr_1" }));
    rerender(<PayScreen shareId="shr_1" />);
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    expect(sync).toHaveBeenCalledTimes(1);
  });

  describe("back from PayPal", () => {
    const held = { data: { outcome: "completed", share: { authorization_id: "HOLD1" } } };
    const busy = { error: { status: 409, data: { error: "resolve_in_progress", message: "Busy." } } };

    it("asks for nothing without a returned order", () => {
      answer({ data: share });
      render(<PayScreen shareId="shr_1" />);
      expect(authorize).not.toHaveBeenCalled();
    });

    it("confirms once, hides the button meanwhile, then shows the hold and drops the token", async () => {
      answer({ data: { ...share, status: "held", payable: false } });
      let finish: (value: unknown) => void = () => undefined;
      authorize.mockReturnValue(new Promise((done) => (finish = done)));
      render(<PayScreen shareId="shr_1" returned={{ orderId: "O1", cancelled: false }} />);

      expect(screen.getByText("Confirming with PayPal…")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /PayPal/ })).not.toBeInTheDocument();
      expect(authorize).toHaveBeenCalledTimes(1);
      expect(authorize).toHaveBeenCalledWith({ shareId: "shr_1", orderId: "O1" });

      finish(held);
      expect(await screen.findByText("Hold HOLD1")).toBeInTheDocument();
      expect(screen.getByText(/Your \$80.00 is held/)).toBeInTheDocument();
      expect(refetch).toHaveBeenCalled();
      expect(window.location.search).toBe("");
    });

    it("shows nothing alarming while the share reads as unknown during the call", () => {
      answer({ data: { ...share, status: "authorize_unknown", payable: false } });
      authorize.mockReturnValue(new Promise(() => undefined));
      render(<PayScreen shareId="shr_1" returned={{ orderId: "O1", cancelled: false }} />);

      expect(screen.getByText("Confirming with PayPal…")).toBeInTheDocument();
      expect(screen.queryByText("Hold unknown")).not.toBeInTheDocument();
      expect(screen.queryByText(/did not return a clear result/)).not.toBeInTheDocument();
    });

    it("shows the API's sentence when PayPal refused, and offers the way back", async () => {
      answer({ data: { ...share, status: "checkout_open" } });
      authorize.mockResolvedValue({
        error: {
          status: 502,
          data: { error: "paypal_failed", message: "PayPal did not approve this hold." },
        },
      });
      render(<PayScreen shareId="shr_1" returned={{ orderId: "O1", cancelled: false }} />);

      expect(await screen.findByText("PayPal did not approve this hold.")).toHaveAttribute("role", "alert");
      expect(screen.getByRole("button", { name: /Continue in PayPal/ })).toBeInTheDocument();
      expect(window.location.search).toBe("");
    });

    it("keeps the token when the server could not be reached, so a refresh can ask again", async () => {
      answer({ data: { ...share, status: "checkout_open" } });
      authorize.mockResolvedValue({ error: { status: "FETCH_ERROR", error: "failed" } });
      render(<PayScreen shareId="shr_1" returned={{ orderId: "O1", cancelled: false }} />);

      await screen.findByText(/could not be reached/);
      expect(window.location.search).toContain("token=O1");
    });

    it("closes a cancelled checkout, says nothing was held and drops the query", async () => {
      window.history.replaceState(null, "", "/pay/shr_1?cancelled=1&token=O1");
      answer({ data: { ...share, status: "declined" } });
      let finish: (value: unknown) => void = () => undefined;
      sync.mockReturnValue(new Promise((done) => (finish = done)));
      render(<PayScreen shareId="shr_1" returned={{ orderId: null, cancelled: true }} />);

      expect(screen.getByText("Closing the checkout…")).toBeInTheDocument();
      expect(sync).toHaveBeenCalledWith({ shareId: "shr_1", buyerCancelled: true });
      expect(authorize).not.toHaveBeenCalled();

      finish({ data: {} });
      expect(await screen.findByText("Checkout closed. Nothing was held.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Hold my share with PayPal/ })).toBeInTheDocument();
      expect(window.location.search).toBe("");
    });

    describe("while another friend is confirming", () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });
      afterEach(() => {
        jest.useRealTimers();
      });

      const advance = async (ms: number) => {
        await act(() => jest.advanceTimersByTimeAsync(ms));
      };

      it("waits and asks again", async () => {
        answer({ data: { ...share, status: "held", payable: false } });
        authorize.mockResolvedValueOnce(busy).mockResolvedValueOnce(held);
        render(<PayScreen shareId="shr_1" returned={{ orderId: "O1", cancelled: false }} />);

        await advance(0);
        expect(authorize).toHaveBeenCalledTimes(1);
        await advance(3_000);
        expect(authorize).toHaveBeenCalledTimes(2);
        expect(screen.getByText("Hold HOLD1")).toBeInTheDocument();
      });

      it("asks again after a server error, so a stored hold still shows its id", async () => {
        answer({ data: { ...share, status: "held", payable: false } });
        const failed = { error: { status: 500, data: { error: "internal", message: "Oops." } } };
        authorize.mockResolvedValueOnce(failed).mockResolvedValueOnce(held);
        render(<PayScreen shareId="shr_1" returned={{ orderId: "O1", cancelled: false }} />);

        await advance(3_000);
        expect(screen.getByText("Hold HOLD1")).toBeInTheDocument();
        expect(screen.queryAllByRole("alert").filter((alert) => alert.textContent)).toHaveLength(0);
      });

      it("gives up after 30 seconds, and keeps the token", async () => {
        answer({ data: { ...share, status: "checkout_open" } });
        authorize.mockResolvedValue(busy);
        render(<PayScreen shareId="shr_1" returned={{ orderId: "O1", cancelled: false }} />);

        await advance(30_000);
        expect(authorize).toHaveBeenCalledTimes(11);
        expect(screen.getByText("Busy.")).toHaveAttribute("role", "alert");
        expect(window.location.search).toContain("token=O1");
      });
    });
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
    expect(screen.getByText("That link does not exist.")).toHaveAttribute("role", "alert");
  });
});
