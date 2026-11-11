import { EnvError, parseEnv } from "../../src/config/env";
import { BASE_ENV, testEnv } from "../helpers/env";

function failure(overrides: Record<string, string | undefined>): EnvError {
  try {
    parseEnv({ ...BASE_ENV, ...overrides });
  } catch (err) {
    if (err instanceof EnvError) return err;
    throw err;
  }
  throw new Error("expected the env parser to throw");
}

describe("env fails fast (test 15)", () => {
  it("accepts a complete environment and applies defaults", () => {
    const env = testEnv();
    expect(env.PORT).toBe(8787);
    expect(env.SIGNUPS_ENABLED).toBe(true);
    expect(env.CORS_ORIGINS).toEqual(["http://localhost:3000"]);
  });

  it("has AI limits with defaults, and rejects zero, negative or fractional values", () => {
    const env = testEnv();
    expect([env.AI_GLOBAL_PER_MIN, env.AI_USER_PER_MIN, env.AI_USER_PER_DAY]).toEqual([12, 6, 30]);
    expect([env.AI_IP_PER_MIN, env.AI_IP_PER_DAY, env.AI_DAILY_CALLS]).toEqual([10, 60, 600]);
    for (const bad of ["0", "-1", "2.5", "many"]) {
      expect(failure({ AI_USER_PER_MIN: bad }).variables).toEqual(["AI_USER_PER_MIN"]);
    }
  });

  it("takes an optional IP hash salt of at least 16 characters", () => {
    expect(testEnv().IP_HASH_SALT).toBeUndefined();
    expect(testEnv({ IP_HASH_SALT: "a-long-enough-salt" }).IP_HASH_SALT).toBe("a-long-enough-salt");
    expect(failure({ IP_HASH_SALT: "short" }).variables).toEqual(["IP_HASH_SALT"]);
  });

  it("names a missing JWT_SECRET", () => {
    expect(failure({ JWT_SECRET: undefined }).variables).toContain("JWT_SECRET");
  });

  it("names a short JWT_SECRET", () => {
    const err = failure({ JWT_SECRET: "too-short" });
    expect(err.variables).toContain("JWT_SECRET");
    expect(err.message).toContain("JWT_SECRET");
  });

  it("refuses PAYPAL_ENV=live", () => {
    expect(failure({ PAYPAL_ENV: "live" }).variables).toContain("PAYPAL_ENV");
  });

  it("refuses the live PayPal API", () => {
    const err = failure({ PAYPAL_API_BASE: "https://api-m.paypal.com" });
    expect(err.variables).toContain("PAYPAL_API_BASE");
  });

  it("defaults to the sandbox API and boots without PayPal keys, with writes on", () => {
    const env = testEnv();
    expect(env.PAYPAL_API_BASE).toBe("https://api-m.sandbox.paypal.com");
    expect(env.PAYPAL_CLIENT_ID).toBeUndefined();
    expect(env.PAYPAL_WRITES_ENABLED).toBe(true);
    expect(env.PAYPAL_TIMEOUT_MS).toBe(15_000);
  });

  it("treats an empty string as unset", () => {
    expect(failure({ JWT_SECRET: "" }).variables).toContain("JWT_SECRET");
    expect(testEnv({ GROQ_API_KEY: "" }).GROQ_API_KEY).toBeUndefined();
  });

  it("reports every bad variable at once", () => {
    const err = failure({ JWT_SECRET: undefined, APP_BASE_URL: "not a url" });
    expect(err.variables).toEqual(expect.arrayContaining(["JWT_SECRET", "APP_BASE_URL"]));
  });

  it("accepts a cookie domain and refuses a malformed one", () => {
    expect(testEnv({ COOKIE_DOMAIN: ".example.com" }).COOKIE_DOMAIN).toBe(".example.com");
    expect(failure({ COOKIE_DOMAIN: "https://example.com" }).variables).toContain("COOKIE_DOMAIN");
  });

  it("refuses a paid model in the LLM chain (L1)", () => {
    expect(failure({ LLM_CHAIN: "openrouter:openai/gpt-4o" }).variables).toContain("LLM_CHAIN");
  });

  it("accepts a DeepSeek entry, with the key optional", () => {
    const env = testEnv({ LLM_CHAIN: "deepseek:deepseek-flash,groq:openai/gpt-oss-120b" });
    expect(env.LLM_CHAIN).toContain("deepseek:deepseek-flash");
    expect(env.DEEPSEEK_API_KEY).toBeUndefined();
    expect(testEnv({ DEEPSEEK_API_KEY: "ds-key" }).DEEPSEEK_API_KEY).toBe("ds-key");
  });

  it("puts DeepSeek first in the default chain, then Groq, then Gemini", () => {
    const providers = testEnv()
      .LLM_CHAIN.split(",")
      .map((entry) => entry.split(":")[0]);
    expect(providers[0]).toBe("deepseek");
    expect(providers.indexOf("groq")).toBeLessThan(providers.indexOf("gemini"));
  });

  it("accepts free OpenRouter entries", () => {
    expect(
      testEnv({ LLM_CHAIN: "groq:openai/gpt-oss-120b,openrouter:meta/llama:free,openrouter:openrouter/free" })
        .LLM_CHAIN,
    ).toContain("llama:free");
  });
});
