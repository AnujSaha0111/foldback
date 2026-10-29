import { randomBytes } from "node:crypto";

export type IdPrefix = "usr" | "con" | "shr" | "op";

/** 128 random bits as 22 base64url characters, behind a prefix. The schema's CHECK constraints require this exact shape. */
export function newId(prefix: IdPrefix): string {
  return `${prefix}_${randomBytes(16).toString("base64url")}`;
}
