import bcrypt from "bcrypt";

export const BCRYPT_COST = 12;
export const PASSWORD_MIN_LENGTH = 10;
/** bcrypt only reads the first 72 bytes, so a longer password would be silently cut. Routes reject it instead. */
export const PASSWORD_MAX_BYTES = 72;

export function hashPassword(plain: string, cost: number = BCRYPT_COST): Promise<string> {
  return bcrypt.hash(plain, cost);
}

let dummyHash: Promise<string> | undefined;

/**
 * Checks a password. With no stored hash (an unknown email) it still does one full bcrypt comparison against a
 * dummy hash and returns false, so a login for an email that does not exist takes as long as a wrong password.
 */
export async function verifyPassword(
  plain: string,
  hash: string | null,
  cost: number = BCRYPT_COST,
): Promise<boolean> {
  if (hash === null) {
    dummyHash ??= bcrypt.hash("not-a-real-password", cost);
    await bcrypt.compare(plain, await dummyHash);
    return false;
  }
  return bcrypt.compare(plain, hash);
}
