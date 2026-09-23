import { createAdminClient } from "./supabase/admin";

/**
 * Who has an email on file, from the only place that actually knows.
 *
 * Saving a spot sets an email and password on the auth user, but nothing was
 * copying that onto the profile row — so the admin pages, which read
 * profiles.email, reported that nobody had saved a spot while two people had.
 * Auth is the source of truth for this, so the admin views ask it directly
 * rather than trusting a mirror that can drift.
 */
export async function emailsByUser(): Promise<Map<string, string>> {
  const admin = createAdminClient();
  const found = new Map<string, string>();
  const perPage = 200;

  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) break;
    const users = data?.users ?? [];
    for (const u of users) if (u.email) found.set(u.id, u.email);
    if (users.length < perPage) break;
  }
  return found;
}
