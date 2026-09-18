"use client";

/** Ask for the keeper password once per browser session. */
export function getKeeperPassword(): string | null {
  const existing = sessionStorage.getItem("keeper_password");
  if (existing) return existing;
  const entered = window.prompt(
    "Keeper password (shared with circle keepers — actions are recorded under your name):"
  );
  if (!entered) return null;
  sessionStorage.setItem("keeper_password", entered);
  return entered;
}

export function clearKeeperPassword() {
  try {
    sessionStorage.removeItem("keeper_password");
  } catch {
    // private windows can refuse storage; nothing to clear then
  }
}

/**
 * Remembers that this browser belongs to a keeper, so the keeper tools can be
 * linked from inside the app instead of typed from memory. Set only after the
 * server has actually accepted the password — a wrong guess marks nothing.
 *
 * Deliberately separate from the password itself: this survives the session so
 * the link stays, while the password still has to be re-entered each session.
 */
const KEEPER_FLAG = "wcc_keeper";

export function rememberKeeper() {
  try {
    localStorage.setItem(KEEPER_FLAG, "1");
  } catch {
    // no storage, no shortcut — the URLs still work
  }
}

export function isKnownKeeper(): boolean {
  try {
    return localStorage.getItem(KEEPER_FLAG) === "1";
  } catch {
    return false;
  }
}

export function forgetKeeper() {
  try {
    localStorage.removeItem(KEEPER_FLAG);
  } catch {
    // nothing to forget
  }
}
