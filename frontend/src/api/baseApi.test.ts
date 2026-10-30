import { errorMessage } from "./baseApi";

describe("errorMessage", () => {
  it("shows the API's own message", () => {
    expect(
      errorMessage({ status: 409, data: { error: "conflict", message: "The deadline has passed." } }),
    ).toBe("The deadline has passed.");
  });

  it("falls back to a plain sentence when the API sent no message", () => {
    const fallback = errorMessage({ status: 500, data: "oops" });
    expect(fallback).toMatch(/could not be reached/);
    expect(errorMessage({ status: "FETCH_ERROR", error: "failed" })).toBe(fallback);
    expect(errorMessage(undefined)).toBe(fallback);
  });

  it("ignores a message that is not text", () => {
    expect(errorMessage({ status: 400, data: { message: 5 } })).toMatch(/could not be reached/);
  });
});
