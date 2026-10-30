import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { useGetMeQuery, useLogoutMutation } from "@/api/authApi";
import { makeStore } from "@/store";
import { SessionPreview } from "./index";

const router = { push: jest.fn(), replace: jest.fn() };
jest.mock("next/navigation", () => ({ useRouter: () => router }));
jest.mock("@/api/authApi");

function mount(me: object, logoutResult: object = { data: undefined }) {
  const logout = jest.fn().mockResolvedValue(logoutResult);
  jest.mocked(useGetMeQuery).mockReturnValue(me as ReturnType<typeof useGetMeQuery>);
  jest
    .mocked(useLogoutMutation)
    .mockReturnValue([logout, { isLoading: false }] as unknown as ReturnType<typeof useLogoutMutation>);
  render(
    <Provider store={makeStore()}>
      <SessionPreview />
    </Provider>,
  );
  return logout;
}

beforeEach(() => {
  router.push.mockClear();
  router.replace.mockClear();
});

describe("SessionPreview", () => {
  it("greets the signed-in user by name", () => {
    mount({ data: { display_name: "Alex Chen" } });
    expect(screen.getByRole("heading", { name: "Hello, Alex Chen" })).toBeInTheDocument();
  });

  it("sends a stale session back to sign in", () => {
    mount({ error: { status: 401 } });
    expect(router.replace).toHaveBeenCalledWith("/login?next=/plans");
  });

  it("does not sign anyone out over a network failure", () => {
    mount({ error: { status: "FETCH_ERROR" } });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("signs out and goes home", async () => {
    const logout = mount({ data: { display_name: "Alex Chen" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/"));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("stops asking who the user is while signing out, so the exit is not mistaken for an expired session", async () => {
    mount({ data: { display_name: "Alex Chen" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(router.push).toHaveBeenCalled());
    expect(jest.mocked(useGetMeQuery).mock.lastCall).toEqual([undefined, { skip: true }]);
  });

  it("stays on the page when signing out fails", async () => {
    mount({ data: { display_name: "Alex Chen" } }, { error: { status: "FETCH_ERROR" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() =>
      expect(jest.mocked(useGetMeQuery).mock.lastCall).toEqual([undefined, { skip: false }]),
    );
    expect(router.push).not.toHaveBeenCalled();
  });
});
