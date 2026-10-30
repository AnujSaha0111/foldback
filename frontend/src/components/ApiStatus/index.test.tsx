import { render, screen } from "@testing-library/react";
import { useGetHealthQuery } from "@/api/healthApi";
import { ApiStatus } from "./index";

jest.mock("@/api/healthApi");

const query = jest.mocked(useGetHealthQuery);
const answer = (state: object) => query.mockReturnValue(state as ReturnType<typeof useGetHealthQuery>);

describe("ApiStatus", () => {
  it("says it is checking first", () => {
    answer({ isLoading: true });
    render(<ApiStatus />);
    expect(screen.getByText("Checking")).toBeInTheDocument();
  });

  it("shows Online with the version when the API answers", () => {
    answer({
      isLoading: false,
      isError: false,
      data: {
        ok: true,
        service: "foldback",
        version: "1.2.3",
        paypal_env: "sandbox",
        llm: true,
        ai_calls_left: 5,
      },
    });
    render(<ApiStatus />);
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText(/v1\.2\.3/)).toBeInTheDocument();
    expect(screen.getByText(/PayPal sandbox/)).toBeInTheDocument();
  });

  it("shows Unreachable when the request fails", () => {
    answer({ isLoading: false, isError: true });
    render(<ApiStatus />);
    expect(screen.getByText("Unreachable")).toBeInTheDocument();
  });
});
