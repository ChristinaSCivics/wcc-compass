/**
 * Deterministic name scrubbing for the collective weave.
 *
 * The weave prompt already forbids names, and the weave route only ever labels
 * inputs positionally — but names still leaked, because they appear *inside*
 * the confirmed vision text itself ("dinner parties with my partner Dana").
 * An instruction is not an enforcement mechanism, so this is the backstop:
 * given the roster of display names, replace any occurrence in the output.
 *
 * Applied both when a weave is written and when one is rendered, so weaves
 * stored before this existed are cleaned on the way to the screen too.
 */

const REPLACEMENT = "one participant";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Names worth matching: 3+ chars, so initials and stray short handles don't
 * turn ordinary words into redactions.
 */
function usableNames(names: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const n of names) {
    const name = (n ?? "").trim();
    if (name.length < 3) continue;
    out.add(name);
    // also match the first token of a full name ("Dana Reyes" -> "Dana")
    const first = name.split(/\s+/)[0];
    if (first.length >= 3) out.add(first);
  }
  // longest first, so "Dana Reyes" is replaced before "Dana"
  return [...out].sort((a, b) => b.length - a.length);
}

export function scrubNames<T>(value: T, names: (string | null | undefined)[]): T {
  const list = usableNames(names);
  if (list.length === 0) return value;

  const patterns = list.map(
    (n) => new RegExp(`(?<![\\w])${escapeRegExp(n)}(?![\\w])`, "gi")
  );

  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      let s = v;
      for (const re of patterns) s = s.replace(re, REPLACEMENT);
      return s;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v !== null && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, walk(val)])
      );
    }
    return v;
  };

  return walk(value) as T;
}
