import { parseEnv } from "../../src/config/env";
import type { Env } from "../../src/config/env";

export const BASE_ENV: Record<string, string> = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://foldback_app:foldback_app@localhost:5433/foldback_test",
  JWT_SECRET: "test-secret-test-secret-test-secret-32chars",
  CORS_ORIGINS: "http://localhost:3000",
  APP_BASE_URL: "http://localhost:3000",
  PAYPAL_ENV: "sandbox",
};

/** A valid test environment, with any variable replaced or (with undefined) removed. */
export function testEnv(overrides: Record<string, string | undefined> = {}): Env {
  return parseEnv({ ...BASE_ENV, ...overrides });
}
