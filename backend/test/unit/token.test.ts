import { SESSION_TTL_SECONDS, signSession, verifySession } from "../../src/services/token";
import type { SessionClaims } from "../../src/services/token";

const SECRET = "unit-test-secret-unit-test-secret-32";
const CLAIMS: SessionClaims = { sub: "usr_AAAAAAAAAAAAAAAAAAAAAA", kind: "member" };

function b64(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

describe("session token", () => {
  it("round-trips the claims", () => {
    expect(verifySession(signSession(CLAIMS, SECRET), SECRET)).toEqual(CLAIMS);
  });

  it("lasts seven days", () => {
    expect(SESSION_TTL_SECONDS).toBe(604_800);
  });

  it("rejects a token signed with another secret", () => {
    expect(verifySession(signSession(CLAIMS, "another-secret-another-secret-32chars"), SECRET)).toBeNull();
  });

  it("rejects an expired token", () => {
    expect(verifySession(signSession(CLAIMS, SECRET, -10), SECRET)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const [header, , signature] = signSession(CLAIMS, SECRET).split(".");
    const forged = b64({ sub: "usr_BBBBBBBBBBBBBBBBBBBBBB", kind: "member", exp: 9_999_999_999 });
    expect(verifySession(`${header}.${forged}.${signature}`, SECRET)).toBeNull();
  });

  it("rejects the unsigned 'none' algorithm", () => {
    const token = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: CLAIMS.sub, kind: "member", exp: 9_999_999_999 })}.`;
    expect(verifySession(token, SECRET)).toBeNull();
  });

  it("rejects claims of the wrong shape", () => {
    expect(verifySession(signSession({ sub: "not-an-id", kind: "member" }, SECRET), SECRET)).toBeNull();
    expect(
      verifySession(signSession({ sub: CLAIMS.sub, kind: "admin" as "member" }, SECRET), SECRET),
    ).toBeNull();
  });

  it("returns null for garbage and never throws", () => {
    expect(verifySession("", SECRET)).toBeNull();
    expect(verifySession("not.a.token", SECRET)).toBeNull();
  });
});
