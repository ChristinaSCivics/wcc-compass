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
  sessionStorage.removeItem("keeper_password");
}
