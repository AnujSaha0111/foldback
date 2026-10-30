/** @jest-environment node */
import { NextRequest } from "next/server";
import { config, proxy } from "./proxy";

const request = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3000${path}`, cookie ? { headers: { cookie } } : {});

describe("proxy", () => {
  it("sends a visitor with no session to sign in, and remembers where they were going", () => {
    const response = proxy(request("/plans/abc?x=1"));
    expect(response.status).toBe(307);
    const target = new URL(response.headers.get("location") ?? "");
    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("next")).toBe("/plans/abc?x=1");
  });

  it("lets a visitor with a session cookie through", () => {
    const response = proxy(request("/plans", "fb_session=anything"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("guards only the plans screens", () => {
    expect(config.matcher).toEqual(["/plans/:path*"]);
  });
});
