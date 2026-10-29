import { newId } from "../../src/db/ids";

describe("ids", () => {
  it("match the schema's format: a prefix and 22 base64url characters", () => {
    expect(newId("usr")).toMatch(/^usr_[A-Za-z0-9_-]{22}$/);
    expect(newId("con")).toMatch(/^con_[A-Za-z0-9_-]{22}$/);
    expect(newId("shr")).toMatch(/^shr_[A-Za-z0-9_-]{22}$/);
    expect(newId("op")).toMatch(/^op_[A-Za-z0-9_-]{22}$/);
  });

  it("do not repeat", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId("shr")));
    expect(ids.size).toBe(1000);
  });
});
