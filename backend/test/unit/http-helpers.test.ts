import { clientIp } from "../../src/http/clientIp";
import { readCookie } from "../../src/http/cookies";

describe("readCookie", () => {
  it("finds one cookie among several", () => {
    expect(readCookie("a=1; fb_session=abc.def; b=2", "fb_session")).toBe("abc.def");
  });
  it("returns null when absent, empty, or malformed", () => {
    expect(readCookie(undefined, "fb_session")).toBeNull();
    expect(readCookie("", "fb_session")).toBeNull();
    expect(readCookie("other=1", "fb_session")).toBeNull();
    expect(readCookie("fb_session=%E0%A4%A", "fb_session")).toBeNull();
  });
  it("does not match a cookie whose name only ends the same way", () => {
    expect(readCookie("x_fb_session=1", "fb_session")).toBeNull();
  });
});

describe("clientIp", () => {
  it("uses the socket address when no proxy is trusted", () => {
    expect(clientIp("9.9.9.9", "10.0.0.1", 0)).toBe("10.0.0.1");
  });
  it("takes the entry one hop from the right behind one proxy", () => {
    expect(clientIp("1.1.1.1, 2.2.2.2", "10.0.0.1", 1)).toBe("2.2.2.2");
  });
  it("cannot be spoofed by an extra left-most entry the client added", () => {
    expect(clientIp("6.6.6.6, 1.1.1.1", "10.0.0.1", 1)).toBe("1.1.1.1");
  });
  it("takes two hops from the right behind two proxies", () => {
    expect(clientIp("1.1.1.1, 2.2.2.2, 3.3.3.3", "10.0.0.1", 2)).toBe("2.2.2.2");
  });
  it("falls back to the socket address when the header is missing or empty", () => {
    expect(clientIp(undefined, "10.0.0.1", 1)).toBe("10.0.0.1");
    expect(clientIp(" , ", "10.0.0.1", 1)).toBe("10.0.0.1");
  });
  it("uses the first entry when there are fewer entries than trusted hops", () => {
    expect(clientIp("1.1.1.1", "10.0.0.1", 3)).toBe("1.1.1.1");
  });
});
