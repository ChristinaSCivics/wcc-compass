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
