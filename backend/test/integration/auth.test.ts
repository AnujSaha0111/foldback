import request from "supertest";
import { ORIGIN, buildApp, sessionCookie, setCookieLine } from "../helpers/app";
import { count, createPools, prepareDatabase, truncateAll } from "../helpers/db";
import type { Pools } from "../helpers/db";

let pools: Pools;

beforeAll(async () => {
  pools = createPools();
  await prepareDatabase(pools.owner);
});

beforeEach(async () => {
  await truncateAll(pools.owner);
});

afterAll(async () => {
  await pools.app.end();
  await pools.owner.end();
});

const SIGNUP = { email: "alex@example.com", password: "a-long-password-1", display_name: "Alex Chen" };

function post(app: ReturnType<typeof buildApp>, path: string, body: object = {}): request.Test {
  return request(app).post(path).set("Origin", ORIGIN).send(body);
}

describe("signup (test 17)", () => {
  it("returns 201, sets an httpOnly Secure SameSite=Lax cookie, and seeds two sample plans", async () => {
    const app = buildApp(pools);
    const res = await post(app, "/api/auth/signup", SIGNUP);
    expect(res.status).toBe(201);
    const cookie = setCookieLine(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Max-Age=604800/);
    const user = (res.body as { user: Record<string, unknown> }).user;
    expect(user).toMatchObject({
      kind: "member",
      email: "alex@example.com",
      display_name: "Alex Chen",
      expires_at: null,
    });
    const userId = user["id"] as string;
    expect(await count(pools.owner, "contracts", "owner_id = $1 AND money_source = 'sample'", [userId])).toBe(
      2,
    );
  });

  it("never puts the token or a password hash in the body", async () => {
    const res = await post(buildApp(pools), "/api/auth/signup", SIGNUP);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain("password");
    expect(text).not.toContain("$2b$");
    expect(text).not.toContain(sessionCookie(res).split("=")[1] ?? "x");
  });

  it("returns 409 email_taken for the same email in another case, and creates nothing", async () => {
    const app = buildApp(pools);
    await post(app, "/api/auth/signup", SIGNUP);
    const again = await post(app, "/api/auth/signup", { ...SIGNUP, email: "ALEX@Example.com" });
    expect(again.status).toBe(409);
    expect((again.body as { error: string }).error).toBe("email_taken");
    expect(await count(pools.owner, "users")).toBe(1);
    expect(await count(pools.owner, "contracts")).toBe(2);
  });

  it("returns 403 signups_disabled when the kill switch is off", async () => {
    const res = await post(
      buildApp(pools, { env: { SIGNUPS_ENABLED: "false" } }),
      "/api/auth/signup",
      SIGNUP,
    );
    expect(res.status).toBe(403);
    expect((res.body as { error: string }).error).toBe("signups_disabled");
  });
});

describe("validation", () => {
  it("rejects unknown fields, a short password, a long password, and a bad email with 400", async () => {
    const app = buildApp(pools);
    const bad = [
      { ...SIGNUP, extra: "nope" },
      { ...SIGNUP, password: "short" },
      { ...SIGNUP, password: "x".repeat(73) },
      { ...SIGNUP, email: "not-an-email" },
      { ...SIGNUP, display_name: "" },
    ];
    for (const body of bad) {
      const res = await post(app, "/api/auth/signup", body);
      expect(res.status).toBe(400);
      expect((res.body as { error: string }).error).toBe("bad_request");
    }
    expect(await count(pools.owner, "users")).toBe(0);
  });
});

describe("login (test 18)", () => {
  it("does not reveal whether an email exists: same status and body for both failures", async () => {
    const app = buildApp(pools);
    await post(app, "/api/auth/signup", SIGNUP);
    const wrongPassword = await post(app, "/api/auth/login", {
      email: SIGNUP.email,
      password: "wrong-password-1",
    });
    const unknownEmail = await post(app, "/api/auth/login", {
      email: "nobody@example.com",
      password: "wrong-password-1",
    });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    const strip = (body: object): object => ({ ...body, request_id: undefined });
    expect(strip(wrongPassword.body as object)).toEqual(strip(unknownEmail.body as object));
    expect((wrongPassword.body as { error: string }).error).toBe("invalid_credentials");
  });

  it("signs in with the right password, sets the cookie, and records the login time", async () => {
    const app = buildApp(pools);
    await post(app, "/api/auth/signup", SIGNUP);
    const res = await post(app, "/api/auth/login", { email: "ALEX@example.com", password: SIGNUP.password });
    expect(res.status).toBe(200);
    expect(sessionCookie(res)).toMatch(/^fb_session=/);
    expect(await count(pools.owner, "users", "last_login_at IS NOT NULL")).toBe(1);
  });
});

describe("guest (test 19)", () => {
  it("returns 201 with a guest that expires in about 7 days and has two sample plans", async () => {
    const res = await post(buildApp(pools), "/api/auth/guest");
    expect(res.status).toBe(201);
    const user = (res.body as { user: Record<string, unknown> }).user;
    expect(user["kind"]).toBe("guest");
    expect(user["email"]).toBeNull();
    const days = (new Date(user["expires_at"] as string).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.99);
    expect(days).toBeLessThan(7.01);
    expect(await count(pools.owner, "contracts", "owner_id = $1", [user["id"]])).toBe(2);
  });
});

describe("session (me and logout)", () => {
  it("me returns the user for a valid cookie and 401 without one", async () => {
    const app = buildApp(pools);
    const signup = await post(app, "/api/auth/signup", SIGNUP);
    const me = await request(app).get("/api/auth/me").set("Cookie", sessionCookie(signup));
    expect(me.status).toBe(200);
    expect((me.body as { user: { email: string } }).user.email).toBe("alex@example.com");
    const anonymous = await request(app).get("/api/auth/me");
    expect(anonymous.status).toBe(401);
    expect((anonymous.body as { error: string }).error).toBe("unauthenticated");
  });

  it("refuses a tampered cookie", async () => {
    const app = buildApp(pools);
    const signup = await post(app, "/api/auth/signup", SIGNUP);
    const forged = `${sessionCookie(signup)}x`;
    expect((await request(app).get("/api/auth/me").set("Cookie", forged)).status).toBe(401);
  });

  it("signs an expired guest out even though the token is still valid", async () => {
    const app = buildApp(pools);
    const res = await post(app, "/api/auth/guest");
    const cookie = sessionCookie(res);
    const id = (res.body as { user: { id: string } }).user.id;
    await pools.owner.query("UPDATE users SET expires_at = now() - interval '1 minute' WHERE id = $1", [id]);
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).status).toBe(401);
  });

  it("refuses a valid token whose user no longer exists", async () => {
    const app = buildApp(pools);
    const res = await post(app, "/api/auth/signup", SIGNUP);
    await pools.owner.query("TRUNCATE users CASCADE");
    expect((await request(app).get("/api/auth/me").set("Cookie", sessionCookie(res))).status).toBe(401);
  });

  it("logout clears the cookie and returns 204", async () => {
    const res = await post(buildApp(pools), "/api/auth/logout");
    expect(res.status).toBe(204);
    expect(setCookieLine(res)).toMatch(/fb_session=;/);
  });
});

describe("origin check (test 21)", () => {
  it("returns 403 bad_origin for a POST with no Origin, or one that is not allowed", async () => {
    const app = buildApp(pools);
    const none = await request(app).post("/api/auth/guest").send({});
    expect(none.status).toBe(403);
    expect((none.body as { error: string }).error).toBe("bad_origin");
    const evil = await request(app).post("/api/auth/guest").set("Origin", "https://evil.example").send({});
    expect(evil.status).toBe(403);
    expect(await count(pools.owner, "users")).toBe(0);
  });

  it("accepts an allowed Origin, or an allowed Referer when there is no Origin", async () => {
    const app = buildApp(pools);
    expect((await request(app).post("/api/auth/guest").set("Origin", ORIGIN).send({})).status).toBe(201);
    expect(
      (await request(app).post("/api/auth/guest").set("Referer", `${ORIGIN}/login`).send({})).status,
    ).toBe(201);
  });

  it("treats Origin as authoritative: a bad or null Origin is refused even with an allowed Referer", async () => {
    const app = buildApp(pools);
    const send = (origin: string): request.Test =>
      request(app).post("/api/auth/guest").set("Origin", origin).set("Referer", `${ORIGIN}/login`).send({});
    expect((await send("null")).status).toBe(403);
    expect((await send("https://evil.example")).status).toBe(403);
    expect(await count(pools.owner, "users")).toBe(0);
  });

  it("accepts CORS_ORIGINS written with a trailing slash, for both the origin check and cors", async () => {
    const app = buildApp(pools, { env: { CORS_ORIGINS: `${ORIGIN}/` } });
    const res = await request(app).post("/api/auth/guest").set("Origin", ORIGIN).send({});
    expect(res.status).toBe(201);
    expect(res.headers["access-control-allow-origin"]).toBe(ORIGIN);
  });

  it("does not check GET requests", async () => {
    expect((await request(buildApp(pools)).get("/api/auth/me")).status).toBe(401);
  });

  it("answers a CORS preflight for the allowed origin with credentials", async () => {
    const res = await request(buildApp(pools))
      .options("/api/auth/login")
      .set("Origin", ORIGIN)
      .set("Access-Control-Request-Method", "POST");
    expect(res.headers["access-control-allow-origin"]).toBe(ORIGIN);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });
});

describe("rate limits", () => {
  it("limits login attempts per IP and email, with Retry-After", async () => {
    const app = buildApp(pools, { limits: { login: { limit: 3, windowMs: 60_000 } } });
    const attempt = (): request.Test =>
      post(app, "/api/auth/login", { email: "x@example.com", password: "whatever-1" });
    for (let i = 0; i < 3; i += 1) expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect((blocked.body as { error: string }).error).toBe("rate_limited");
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    const other = await post(app, "/api/auth/login", { email: "other@example.com", password: "whatever-1" });
    expect(other.status).toBe(401);
  });

  it("limits guest creation per IP", async () => {
    const app = buildApp(pools, { limits: { guest: { limit: 2, windowMs: 60_000 } } });
    expect((await post(app, "/api/auth/guest")).status).toBe(201);
    expect((await post(app, "/api/auth/guest")).status).toBe(201);
    expect((await post(app, "/api/auth/guest")).status).toBe(429);
  });

  it("uses the default limits from the spec", async () => {
    const app = buildApp(pools, { realLimits: true });
    for (let i = 0; i < 5; i += 1) expect((await post(app, "/api/auth/guest")).status).toBe(201);
    expect((await post(app, "/api/auth/guest")).status).toBe(429);
  });
});
