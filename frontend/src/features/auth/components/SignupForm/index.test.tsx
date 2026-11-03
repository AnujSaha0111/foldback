import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useGetMeQuery, useSignupMutation } from "@/api/authApi";
import { SignupForm } from "./index";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/api/authApi");

const hook = jest.mocked(useSignupMutation);

function answer(result: object, state: object = {}) {
  const signup = jest.fn().mockResolvedValue(result);
  hook.mockReturnValue([signup, state] as unknown as ReturnType<typeof useSignupMutation>);
  return signup;
}

beforeEach(() => {
  push.mockClear();
  jest.mocked(useGetMeQuery).mockReturnValue({} as ReturnType<typeof useGetMeQuery>);
});

describe("SignupForm", () => {
  it("sends the name as display_name and goes to the plans", async () => {
    const signup = answer({ data: { user: {} } });
    render(<SignupForm />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alex Chen" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alex@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "long enough please" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "long enough please" } });
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/plans"));
    expect(signup).toHaveBeenCalledWith({
      display_name: "Alex Chen",
      email: "alex@example.com",
      password: "long enough please",
    });
  });

  it("does not send when the two passwords differ, and says so", () => {
    const signup = answer({ data: { user: {} } });
    render(<SignupForm />);
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "long enough please" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "long enough please!" } });
    expect(screen.getByLabelText("Confirm password")).toHaveAccessibleDescription(
      "The passwords do not match.",
    );
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }));
    expect(signup).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the password rule", () => {
    answer({});
    render(<SignupForm />);
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription("At least 10 characters");
  });

  it("shows the API's sentence when the request fails", async () => {
    answer({ error: {} }, { error: { status: 409, data: { error: "x", message: "That email is taken." } } });
    render(<SignupForm />);
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That email is taken.");
    expect(push).not.toHaveBeenCalled();
  });
});
