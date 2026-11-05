import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { useGetContractsQuery } from "@/api/contractsApi";
import { makeStore } from "@/store";
import { Palette } from "./Palette";

const router = { push: jest.fn() };
jest.mock("next/navigation", () => ({ useRouter: () => router }));
jest.mock("@/api/contractsApi");

const plans = [
  { id: "con_cabin", title: "Cabin weekend", status: "active" },
  { id: "con_draft", title: "Unread draft", status: "awaiting_confirmation" },
];

function mount() {
  const actions = { onClose: jest.fn(), onReset: jest.fn(), onSignOut: jest.fn() };
  jest
    .mocked(useGetContractsQuery)
    .mockReturnValue({ data: plans } as unknown as ReturnType<typeof useGetContractsQuery>);
  const store = makeStore();
  render(
    <Provider store={store}>
      <Palette {...actions} />
    </Provider>,
  );
  return { actions, store, input: screen.getByRole("combobox", { name: "Search pages and actions" }) };
}

beforeEach(() => router.push.mockClear());

describe("Palette", () => {
  it("lists places and actions, but not unconfirmed readings", () => {
    mount();
    const names = screen.getAllByRole("option").map((option) => option.firstChild?.textContent);
    expect(names).toEqual(["Plans", "Cabin weekend", "Dark theme", "Reset demo data", "Sign out"]);
  });

  it("filters as you type and opens the chosen plan with Enter", () => {
    const { actions, input } = mount();
    fireEvent.change(input, { target: { value: "cab" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(actions.onClose).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith("/plans/con_cabin");
  });

  it("moves with the arrow keys, wrapping at the ends", () => {
    const { input } = mount();
    expect(screen.getByRole("option", { selected: true })).toHaveTextContent("Plans");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getByRole("option", { selected: true })).toHaveTextContent("Sign out");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("option", { selected: true })).toHaveTextContent("Cabin weekend");
  });

  it("switches the theme and hands reset and sign-out to the header", () => {
    const { actions, store, input } = mount();
    fireEvent.click(screen.getByRole("option", { name: /Dark theme/ }));
    expect(store.getState().theme.mode).toBe("dark");
    fireEvent.change(input, { target: { value: "sign" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(actions.onSignOut).toHaveBeenCalled();
    expect(actions.onReset).not.toHaveBeenCalled();
  });

  it("says when nothing matches", () => {
    const { input } = mount();
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getByText("Nothing matches “zzz”.")).toBeInTheDocument();
  });
});
