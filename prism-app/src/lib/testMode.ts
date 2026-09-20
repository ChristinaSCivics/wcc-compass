"use client";

/**
 * Test mode, remembered per browser.
 *
 * `?test=1` used to apply to exactly one entry, so forgetting it once — or
 * pressing "Start fresh" while testing — minted a real account that counted in
 * the weave, the synthesis and the member counts. Three test identities got
 * into the collective that way.
 *
 * Now arming it sticks to the browser until it's deliberately turned off, and
 * every entry from that browser stays sandboxed.
 */
const KEY = "wcc_test_mode";

/** Storage can throw in private windows; test mode is never worth a crash. */
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function isTestArmed(): boolean {
  return safe(() => localStorage.getItem(KEY) === "1", false);
}

export function armTestMode() {
  safe(() => localStorage.setItem(KEY, "1"), undefined);
}

export function disarmTestMode() {
  safe(() => localStorage.removeItem(KEY), undefined);
}

/**
 * Names that are obviously someone trying the product rather than joining it.
 *
 * Every test identity that reached the collective map got there by someone
 * typing exactly one of these and forgetting the ?test=1 — so the name itself
 * is treated as the signal. Deliberately announced rather than silent: a real
 * person whose name happens to match should see what's about to happen and be
 * able to choose otherwise, not discover later that they were left off the map.
 */
const TEST_NAMES =
  /\b(test|tests|tester|testers|testing|sandbox|dummy|qa|asdf|foo|bar)\b|\btest\d+\b|test$/i;

export function looksLikeTest(name: string): boolean {
  return TEST_NAMES.test(name.trim());
}
