import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { useGetMeQuery, useLogoutMutation } from "@/api/authApi";
import { makeStore } from "@/store";
import { AppHeader } from "./index";

const router = { push: jest.fn(), replace: jest.fn() };
jest.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/plans/abc" }));
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () =>
    function MockResetDialog() {
      return <div>Reset dialog</div>;
    },
}));
jest.mock("@/api/authApi");

function mount(me: object, logoutResult: object = { data: undefined }) {
  const logout = jest.fn().mockResolvedValue(logoutResult);
  jest.mocked(useGetMeQuery).mockReturnValue(me as ReturnType<typeof useGetMeQuery>);
  jest
    .mocked(useLogoutMutation)
    .mockReturnValue([logout, { isLoading: false }] as unknown as ReturnType<typeof useLogoutMutation>);
  render(
    <Provider store={makeStore()}>
      <AppHeader />
    </Provider>,
  );
  return logout;
}

const member = { display_name: "Alex Chen", expires_at: null };

beforeEach(() => {
  router.push.mockClear();
  router.replace.mockClear();
});

describe("AppHeader", () => {
  it("shows the user's name, with no guest chip for a member", () => {
    mount({ data: member });
    expect(screen.getByText("Alex Chen")).toBeInTheDocument();
    expect(screen.queryByText(/expires in/)).not.toBeInTheDocument();
  });

  it("shows how long a guest has left", () => {
    const expires_at = new Date(Date.now() + 6.5 * 86_400_000).toISOString();
    mount({ data: { display_name: "Guest 1", expires_at } });
    expect(screen.getByText("Guest · expires in 7 days")).toBeInTheDocument();
  });

  it("says day for the last day", () => {
    const expires_at = new Date(Date.now() + 3_600_000).toISOString();
    mount({ data: { display_name: "Guest 1", expires_at } });
    expect(screen.getByText("Guest · expires in 1 day")).toBeInTheDocument();
  });

  it("sends a stale session to sign in and remembers the page", () => {
    mount({ error: { status: 401 } });
    expect(router.replace).toHaveBeenCalledWith("/login?next=%2Fplans%2Fabc");
  });

  it("does not sign anyone out over a network failure", () => {
    mount({ error: { status: "FETCH_ERROR" } });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("signs out, goes home, and stops asking who the user is", async () => {
    const logout = mount({ data: member });
    fireEvent.click(screen.getByRole("button", { name: "Sign out", hidden: true }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/"));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
    expect(jest.mocked(useGetMeQuery).mock.lastCall).toEqual([undefined, { skip: true }]);
  });

  it("stays on the page when signing out fails", async () => {
    mount({ data: member }, { error: { status: "FETCH_ERROR" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign out", hidden: true }));
    await waitFor(() =>
      expect(jest.mocked(useGetMeQuery).mock.lastCall).toEqual([undefined, { skip: false }]),
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it("opens the reset dialog on request", () => {
    mount({ data: member });
    expect(screen.queryByText("Reset dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset demo data", hidden: true }));
    expect(screen.getByText("Reset dialog")).toBeInTheDocument();
  });
});
