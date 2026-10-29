import { z } from "zod";
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from "../services/password";

const email = z.string().trim().max(254).pipe(z.email());

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(128)
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= PASSWORD_MAX_BYTES,
    `must be at most ${PASSWORD_MAX_BYTES} bytes`,
  );

export const signupSchema = z.strictObject({
  email,
  password,
  display_name: z.string().trim().min(1).max(80),
});

/** Login does not re-check the length rules, so a wrong short password is a normal 401, not a 400. */
export const loginSchema = z.strictObject({
  email,
  password: z.string().min(1).max(128),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
