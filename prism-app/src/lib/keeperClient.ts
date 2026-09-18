"use client";

/**
 * Keeper credentials, held for the browser session.
 *
 * This used to ask with window.prompt, which browsers can suppress, can't be
 * styled, gives no way to correct a typo, and tells you nothing when it's
 * wrong. The pages now render a real form instead, so this is just storage.
 */
const PASSWORD_KEY = "keeper_password";
const KEEPER_FLAG = "wcc_keeper";

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/** The password entered this session, if there is one. Never prompts. */
export function getKeeperPassword(): string | null {
  return safe(() => sessionStorage.getItem(PASSWORD_KEY), null);
}

export function setKeeperPassword(value: string) {
  safe(() => sessionStorage.setItem(PASSWORD_KEY, value), undefined);
}

export function clearKeeperPassword() {
  safe(() => sessionStorage.removeItem(PASSWORD_KEY), undefined);
}

/**
 * Remembers that this browser belongs to a keeper, so the tools can be linked
 * from inside the app instead of typed from memory. Set only once the server
 * has actually accepted the password — a wrong guess marks nothing.
 *
 * Deliberately separate from the password: this survives the session so the
 * link stays, while the password is still re-entered each session.
 */
export function rememberKeeper() {
  safe(() => localStorage.setItem(KEEPER_FLAG, "1"), undefined);
}

export function isKnownKeeper(): boolean {
  return safe(() => localStorage.getItem(KEEPER_FLAG) === "1", false);
}

export function forgetKeeper() {
  safe(() => localStorage.removeItem(KEEPER_FLAG), undefined);
}
