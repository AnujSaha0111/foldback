import { PassThrough } from "node:stream";
import { createLogger, redact } from "../../src/observability/logger";
import { runWithContext } from "../../src/observability/requestContext";

function capture(): { logger: ReturnType<typeof createLogger>; lines: () => string } {
  const stream = new PassThrough();
  let text = "";
  stream.on("data", (chunk: Buffer) => {
    text += chunk.toString();
  });
  return { logger: createLogger({ level: "debug", json: true, stream }), lines: () => text };
}

describe("logger redacts secrets (test 25)", () => {
  it("hides password, authorization and cookie at any depth", () => {
    const { logger, lines } = capture();
    logger.info("login attempt", {
      password: "hunter2-secret",
      headers: {
        authorization: "Bearer abc.def.ghi",
        cookie: "fb_session=jwt-value",
        "x-api-key": "key-123",
      },
      nested: [{ access_token: "tok-999", client_secret: "cs-777", ok: "visible" }],
    });
    const out = lines();
    expect(out).toContain("[REDACTED]");
    for (const secret of [
      "hunter2-secret",
      "Bearer abc.def.ghi",
      "fb_session=jwt-value",
      "key-123",
      "tok-999",
      "cs-777",
    ]) {
      expect(out).not.toContain(secret);
    }
    expect(out).toContain("visible");
  });

  it("adds the request id from the request context", () => {
    const { logger, lines } = capture();
    runWithContext({ requestId: "req-12345678" }, () => logger.info("inside a request"));
    expect(lines()).toContain("req-12345678");
  });

  it("redacts case-insensitively and survives cycles", () => {
    const loop: Record<string, unknown> = { Authorization: "secret-value" };
    loop["self"] = loop;
    const result = JSON.stringify(redact(loop));
    expect(result).not.toContain("secret-value");
    expect(result).toContain("[Truncated]");
  });
});
