import { newId } from "../../src/db/ids";
import {
  findById,
  findCredentialsByEmail,
  insertGuest,
  insertMember,
  touchLastLogin,
} from "../../src/repositories/users.repo";
import { count, createPools, expectDbError, prepareDatabase, truncateAll } from "../helpers/db";
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

const hash = "$2b$04$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234";

describe("users repository", () => {
  it("inserts a member and returns the user without a password hash", async () => {
    const user = await insertMember(pools.app, {
      id: newId("usr"),
      email: "Alex@Example.com",
      passwordHash: hash,
      displayName: "Alex Chen",
    });
    expect(user).toMatchObject({
      kind: "member",
      email: "Alex@Example.com",
      displayName: "Alex Chen",
      expiresAt: null,
    });
    expect(user).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(user)).not.toContain(hash);
  });

  it("returns null for a taken email, ignoring case, without an error", async () => {
    await insertMember(pools.app, {
      id: newId("usr"),
      email: "alex@example.com",
      passwordHash: hash,
      displayName: "A",
    });
    const again = await insertMember(pools.app, {
      id: newId("usr"),
      email: "ALEX@EXAMPLE.COM",
      passwordHash: hash,
      displayName: "B",
    });
    expect(again).toBeNull();
    expect(await count(pools.owner, "users")).toBe(1);
  });

  it("lets two concurrent signups for one email produce exactly one user", async () => {
    const results = await Promise.all(
      [1, 2, 3, 4].map((n) =>
        insertMember(pools.app, {
          id: newId("usr"),
          email: "race@example.com",
          passwordHash: hash,
          displayName: `Racer ${n}`,
        }),
      ),
    );
    expect(results.filter((r) => r !== null)).toHaveLength(1);
    expect(await count(pools.owner, "users")).toBe(1);
  });

  it("inserts a guest that expires and has no email", async () => {
    const expiresAt = new Date(Date.now() + 7 * 86_400_000);
    const user = await insertGuest(pools.app, { id: newId("usr"), displayName: "Guest 1", expiresAt });
    expect(user.kind).toBe("guest");
    expect(user.email).toBeNull();
    expect(user.expiresAt?.getTime()).toBe(expiresAt.getTime());
  });

  it("finds credentials by email, ignoring case, for members only", async () => {
    const member = await insertMember(pools.app, {
      id: newId("usr"),
      email: "sam@example.com",
      passwordHash: hash,
      displayName: "Sam",
    });
    const found = await findCredentialsByEmail(pools.app, "SAM@example.com");
    expect(found?.user.id).toBe(member?.id);
    expect(found?.passwordHash).toBe(hash);
    expect(await findCredentialsByEmail(pools.app, "nobody@example.com")).toBeNull();
  });

  it("finds a user by id without the hash, and null for an unknown id", async () => {
    const member = await insertMember(pools.app, {
      id: newId("usr"),
      email: "j@example.com",
      passwordHash: hash,
      displayName: "Jordan",
    });
    const found = await findById(pools.app, member?.id ?? "");
    expect(found?.displayName).toBe("Jordan");
    expect(found).not.toHaveProperty("passwordHash");
    expect(await findById(pools.app, newId("usr"))).toBeNull();
  });

  it("records the last login time", async () => {
    const member = await insertMember(pools.app, {
      id: newId("usr"),
      email: "m@example.com",
      passwordHash: hash,
      displayName: "Maya",
    });
    expect(member?.lastLoginAt).toBeNull();
    await touchLastLogin(pools.app, member?.id ?? "");
    expect((await findById(pools.app, member?.id ?? ""))?.lastLoginAt).toBeInstanceOf(Date);
  });

  it("lets the schema refuse a malformed id", async () => {
    await expectDbError(
      insertGuest(pools.app, { id: "usr_short", displayName: "G", expiresAt: new Date(Date.now() + 1000) }),
      { code: "23514", constraint: "users_id_format" },
    );
  });
});
