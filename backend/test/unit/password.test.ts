import { BCRYPT_COST, hashPassword, verifyPassword } from "../../src/services/password";

// Cost 4 keeps the tests fast. Production uses BCRYPT_COST.
const COST = 4;

describe("passwords", () => {
  it("hash with bcrypt at the requested cost and never store the plain text", async () => {
    const hash = await hashPassword("correct horse battery", COST);
    expect(hash).toMatch(/^\$2[aby]\$04\$/);
    expect(hash).not.toContain("correct horse");
  });

  it("use cost 12 by default", () => {
    expect(BCRYPT_COST).toBe(12);
  });

  it("give a different hash each time for the same password (random salt)", async () => {
    const [a, b] = await Promise.all([
      hashPassword("same-password-1", COST),
      hashPassword("same-password-1", COST),
    ]);
    expect(a).not.toBe(b);
  });

  it("accept the right password and refuse a wrong one", async () => {
    const hash = await hashPassword("right-password-1", COST);
    await expect(verifyPassword("right-password-1", hash, COST)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password-1", hash, COST)).resolves.toBe(false);
  });

  it("refuse when there is no hash (unknown email) after doing the same work", async () => {
    await expect(verifyPassword("anything-at-all-1", null, COST)).resolves.toBe(false);
  });
});
