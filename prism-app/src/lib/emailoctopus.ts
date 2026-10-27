/**
 * The WCC EmailOctopus audience, as far as the Compass feeds it.
 *
 * Everyone who gives the Compass an email goes in, tagged `prism-beta` and
 * with how they joined (`prism-mastermind`, `prism-saved-spot`,
 * `prism-connect`), so the team has one place to see them.
 *
 * The newsletter is separate, and only a ticked box earns it: the team's
 * `newsletter` tag is what sends the welcome email and puts someone on the
 * newsletter, so it goes on — with `source-beta`, Peter's marker for where the
 * signup came from — only when the person asked for updates. Campaigns meant
 * for the newsletter must go to the `newsletter` segment, never the whole list.
 *
 * Tags are only ever added, never removed, and status is never sent: an
 * upsert that set "subscribed" would quietly re-subscribe someone who had
 * unsubscribed, which is the one thing a mailing list must not do.
 *
 * Nothing here runs without EMAILOCTOPUS_API_KEY, and it never throws — a
 * mailing list being down must never cost someone the thing they came to do.
 */

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const API = "https://api.emailoctopus.com";
// The "Audience" list. Overridable so a test list can stand in.
const LIST_ID = process.env.EMAILOCTOPUS_LIST_ID || "4433d808-c28d-11f1-b998-fdd706948e05";

/** Their Connection Interview recap, when they also said the team may contact them. */
export type Piece = {
  skills?: string[];
  ways_to_participate?: string[];
  time_capacity?: string | null;
  referrals?: unknown[];
  organizations?: unknown[];
};

/**
 * The team's own piece-* and help-* tags, read off the recap. Only tags that
 * already exist in the list, so the team's segments pick these people up
 * alongside everyone who came in through the website form.
 */
export function pieceTags(piece: Piece | null | undefined): string[] {
  if (!piece) return [];
  const skills = new Set(piece.skills ?? []);
  const ways = new Set(piece.ways_to_participate ?? []);
  const tags = new Set<string>();

  if ([...skills].some((s) => s !== "other")) tags.add("piece-skills");
  if (ways.has("join_team") || ways.has("volunteer_time") ||
      ["monthly", "weekly", "ten_plus"].includes(piece.time_capacity ?? "")) tags.add("piece-time");
  if (ways.has("donate") || ways.has("help_find_funders")) tags.add("piece-funding");
  if (ways.has("introduce_organizations") || piece.referrals?.length || piece.organizations?.length) {
    tags.add("piece-introductions");
  }
  if (ways.has("share_vision") || ways.has("advise")) tags.add("piece-ideas");

  if (["software_engineering", "ai_ml", "systems_design", "data", "product_design"].some((s) => skills.has(s))) {
    tags.add("help-technical");
  }
  if (skills.has("grant_writing")) tags.add("help-grants");
  if (skills.has("legal")) tags.add("help-legal");
  if (skills.has("event_hosting")) tags.add("help-events");
  return [...tags];
}

/** How they gave us their email. Each becomes a `prism-*` tag. */
export type AudienceSource = "mastermind" | "saved-spot" | "connect";

export async function addToAudience(input: {
  email: string;
  source?: AudienceSource;
  /** They ticked a box asking for occasional updates. */
  newsletter?: boolean;
  name?: string | null;
  /** Extra tags, e.g. from `pieceTags`. */
  tags?: string[];
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

  const tags: Record<string, boolean> = { "prism-beta": true };
  if (input.source) tags[`prism-${input.source}`] = true;
  if (input.newsletter) {
    tags.newsletter = true;
    tags["source-beta"] = true;
  }
  for (const t of input.tags ?? []) tags[t] = true;

  // Only fill names we were given; never blank one the team already holds.
  const fields: Record<string, string> = {};
  const [first, ...rest] = input.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (first) fields.FirstName = first;
  if (rest.length) fields.LastName = rest.join(" ");

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

/**
 * Is this address getting the newsletter? Read from EmailOctopus itself, so an
 * unsubscribe made from an email footer shows up here too.
 */
export async function newsletterStatus(
  email: string
): Promise<"subscribed" | "unsubscribed" | "no" | "unknown"> {
  const key = process.env.EMAILOCTOPUS_API_KEY;
  if (!key) return "unknown";
  const id = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  try {
    const res = await fetch(`${API}/lists/${LIST_ID}/contacts/${id}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (res.status === 404) return "no";
    if (!res.ok) return "unknown";
    const c = (await res.json()) as { status: string; tags: string[] };
    if (c.status === "unsubscribed") return "unsubscribed";
    return c.tags.includes("newsletter") && c.status === "subscribed" ? "subscribed" : "no";
  } catch {
    return "unknown";
  }
}
