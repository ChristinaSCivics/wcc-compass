/**
 * "Keeper" actions (opening decisions, running synthesis, ratifying outcomes)
 * are gated by a shared password for the pilot — handed person-to-person.
 * Every keeper action is still attributed to the signed-in person's name in
 * the audit log, so the shared password never hides WHO acted.
 * Lightweight by design; real roles return when the org structure exists.
 */
export function checkKeeper(password: unknown): boolean {
  const expected = process.env.KEEPER_PASSWORD;
  if (!expected) return false;
  return typeof password === "string" && password === expected;
}
