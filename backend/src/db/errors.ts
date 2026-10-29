/** True when `err` is a Postgres error that names the given constraint (or trigger-raised constraint). */
export function isConstraintError(err: unknown, constraint: string): boolean {
  return typeof err === "object" && err !== null && "constraint" in err && err.constraint === constraint;
}
