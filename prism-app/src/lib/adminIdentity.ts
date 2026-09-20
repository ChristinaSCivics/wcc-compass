"use client";

/**
 * Who is using the admin tools.
 *
 * The password is shared, so on its own it can only say "someone who holds the
 * password did this" — which is exactly what the open record should never have
 * to say. Picking a name at the door restores attribution without giving
 * everyone their own credential, which is the right trade while this is three
 * people who know each other.
 *
 * Not a security boundary: anyone with the password can pick any name. It's a
 * signature, not an identity check, and the record says so.
 */
export const ADMINS = ["Christina", "Peter", "Alexandar"] as const;
export type Admin = (typeof ADMINS)[number];

/** Sentinel for the free-text option, so the list can stay short. */
export const OTHER = "__other__";

const KEY = "wcc_admin_name";

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function getAdminName(): string | null {
  return safe(() => sessionStorage.getItem(KEY), null);
}

export function setAdminName(name: string) {
  safe(() => sessionStorage.setItem(KEY, name), undefined);
}

export function clearAdminName() {
  safe(() => sessionStorage.removeItem(KEY), undefined);
}
