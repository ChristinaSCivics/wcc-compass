import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Who is who, and what they actually said.
 *
 * Entering without an account mints a new spot each time — another browser,
 * another phone, coming back after signing out — so one person can hold
 * several spots, and several confirmed visions. A keeper links spots on the
 * People page ("same person as…"); those share a person_id. A spot nobody has
 * linked is grouped by name, which is right far more often than not — but two
 * Peters are two people, so a keeper can also set a spot apart (person_id =
 * its own id).
 */
export const personKey = (
  name: string | null | undefined,
  id: string,
  personId?: string | null
) => (personId ? `person:${personId}` : (name ?? "").trim().toLowerCase() || id);

/** Keep each person's latest row, so one person is one voice. */
export function latestPerPerson<T>(
  rows: T[],
  key: (r: T) => string,
  when: (r: T) => string | null | undefined
): T[] {
  const best = new Map<string, T>();
  for (const r of rows) {
    const k = key(r);
    const held = best.get(k);
    if (!held || (when(r) ?? "") > (when(held) ?? "")) best.set(k, r);
  }
  return [...best.values()];
}

/**
 * How many things the person typed in each conversation.
 *
 * Opening a chat sends PRiSM a "Hello" on the person's behalf so PRiSM can
 * speak first. It's stored as theirs, but they never typed it — counting it
 * made everyone who read PRiSM's opening and left look like they'd spoken.
 * Rows are paged because the API returns at most 1,000 per request.
 */
export async function saidPerConversation(admin: SupabaseClient) {
  const said = new Map<string, number>();
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from("messages")
      .select("conversation_id")
      .eq("role", "user")
      .order("created_at")
      .range(from, from + 999);
    for (const m of data ?? []) said.set(m.conversation_id, (said.get(m.conversation_id) ?? 0) + 1);
    if (!data || data.length < 1000) break;
  }
  const { data: openers } = await admin
    .from("messages")
    .select("conversation_id")
    .eq("role", "user")
    .eq("content", "Hello");
  for (const id of new Set((openers ?? []).map((m) => m.conversation_id))) {
    said.set(id, Math.max(0, (said.get(id) ?? 0) - 1));
  }
  return said;
}
