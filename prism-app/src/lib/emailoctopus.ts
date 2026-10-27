/**
 * The WCC EmailOctopus audience, as far as the Compass feeds it.
 *
 * Every time the app collects an email, the address goes into the same
 * "Audience" list the team already mails from, tagged with what the person
 * actually asked for — so a campaign can go to the people who want the call
 * link without reaching the people who only saved their spot.
 *
 * Tags are only ever added, never removed, and status is never sent: an
 * upsert that set "subscribed" would quietly re-subscribe someone who had
 * unsubscribed, which is the one thing a mailing list must not do.
 *
 * Nothing here runs without EMAILOCTOPUS_API_KEY, and it never throws — a
 * mailing list being down must never cost someone the thing they came to do.
 */

import { createAdminClient } from "@/lib/supabase/admin";

const API = "https://api.emailoctopus.com";
// The "Audience" list. Overridable so a test list can stand in.
const LIST_ID = process.env.EMAILOCTOPUS_LIST_ID || "4433d808-c28d-11f1-b998-fdd706948e05";

/** What the person signed up for. Each becomes a `prism-*` tag. */
export type AudienceSource = "mastermind" | "saved-spot" | "connect";

export async function addToAudience(input: {
  email: string;
  source: AudienceSource;
  /** They ticked a box asking for occasional updates — the team's `newsletter` tag. */
  updates?: boolean;
  name?: string | null;
  /** The signed-in person, if any. Test accounts never reach the real list. */
  userId?: string | null;
}): Promise<void> {
  const key = process.env.EMAILOCTOPUS_API_KEY;
  if (!key) return;

  if (input.userId) {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("is_test")
      .eq("id", input.userId)
      .maybeSingle();
    if (data?.is_test) return;
  }

  const tags: Record<string, boolean> = { "prism-beta": true, [`prism-${input.source}`]: true };
  if (input.updates) tags.newsletter = true;

  // Only fill a name we were given; never blank one the team already holds.
  const fields: Record<string, string> = {};
  const first = input.name?.trim().split(/\s+/)[0];
  if (first) fields.FirstName = first;

  try {
    const res = await fetch(`${API}/lists/${LIST_ID}/contacts`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ email_address: input.email.trim().toLowerCase(), tags, fields }),
    });
    if (!res.ok) console.error(`EmailOctopus replied ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error("EmailOctopus unreachable", err);
  }
}
