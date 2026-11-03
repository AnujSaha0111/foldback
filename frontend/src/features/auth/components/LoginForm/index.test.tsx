import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useGetMeQuery, useLoginMutation } from "@/api/authApi";
import { LoginForm } from "./index";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/api/authApi");

const hook = jest.mocked(useLoginMutation);

function answer(result: object, state: object = {}) {
  const login = jest.fn().mockResolvedValue(result);
  hook.mockReturnValue([login, state] as unknown as ReturnType<typeof useLoginMutation>);
  return login;
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alex@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "long enough please" } });
  fireEvent.submit(screen.getByRole("button", { name: "Sign in" }));
}

beforeEach(() => {
  push.mockClear();
  jest.mocked(useGetMeQuery).mockReturnValue({} as ReturnType<typeof useGetMeQuery>);
  window.history.pushState({}, "", "/login");
});

describe("LoginForm", () => {
  it("skips the form when the session is still good", async () => {
    answer({});
    jest
      .mocked(useGetMeQuery)
      .mockReturnValue({ data: { id: "usr_1" } } as unknown as ReturnType<typeof useGetMeQuery>);
    render(<LoginForm />);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/plans"));
  });

  it("sends the fields and goes to the plans", async () => {
    const login = answer({ data: { user: {} } });
    render(<LoginForm />);
    fillAndSubmit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/plans"));
    expect(login).toHaveBeenCalledWith({ email: "alex@example.com", password: "long enough please" });
  });

  it("returns to the page the visitor came from", async () => {
    window.history.pushState({}, "", "/login?next=/plans/abc");
    answer({ data: { user: {} } });
    render(<LoginForm />);
    fillAndSubmit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/plans/abc"));
  });

  it("refuses to send the visitor to another site", async () => {
    window.history.pushState({}, "", "/login?next=//evil.example");
    answer({ data: { user: {} } });
    render(<LoginForm />);
    fillAndSubmit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/plans"));
  });

  it("shows the API's sentence and stays on the page", async () => {
    answer(
      { error: {} },
      { error: { status: 401, data: { error: "x", message: "Email or password is incorrect." } } },
    );
    render(<LoginForm />);
    fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect.");
    expect(push).not.toHaveBeenCalled();
  });

  it("disables the button while signing in", () => {
    answer({}, { isLoading: true });
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
  });
});
