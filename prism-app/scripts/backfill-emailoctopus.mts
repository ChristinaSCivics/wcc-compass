/**
 * One-off: put every email the Compass collected before the EmailOctopus hook
 * existed into the team's Audience list, tagged the same way the live hook
 * tags new ones. Safe to re-run — it upserts, only adds tags, and never sends
 * a status, so nobody who unsubscribed is re-subscribed.
 *
 * Run: npx tsx --env-file=.env.local scripts/backfill-emailoctopus.mts [--apply]
 * Without --apply it prints what it would do and writes nothing.
 */
import { createClient } from "@supabase/supabase-js";
import { addToAudience, type AudienceSource } from "../src/lib/emailoctopus";

const APPLY = process.argv.includes("--apply");

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type Entry = { email: string; source: AudienceSource; updates: boolean; name: string | null; userId: string | null };
const entries: Entry[] = [];

const { data: profiles, error: pErr } = await db.from("profiles").select("id, email, display_name, is_test");
if (pErr) throw pErr;
const testIds = new Set(profiles!.filter((p) => p.is_test).map((p) => p.id));

const { data: signups, error: sErr } = await db
  .from("mastermind_signups")
  .select("email, mailing_list_opt_in, user_id");
if (sErr) throw sErr;
for (const s of signups!) {
  entries.push({ email: s.email, source: "mastermind", updates: s.mailing_list_opt_in, name: null, userId: s.user_id });
}

// Saving a spot writes the address to auth first and the profile second, so
// older saves can be in auth alone.
const { data: auth, error: aErr } = await db.auth.admin.listUsers({ perPage: 1000 });
if (aErr) throw aErr;
const authEmail = new Map(auth.users.map((u) => [u.id, u.email]));
for (const p of profiles!) {
  const email = p.email || authEmail.get(p.id);
  if (email) entries.push({ email, source: "saved-spot", updates: false, name: p.display_name, userId: p.id });
}

const { data: connections, error: cErr } = await db
  .from("connection_profiles")
  .select("user_id, contact, consents")
  .not("contact", "is", null);
if (cErr) throw cErr;
for (const c of connections!) {
  if (!c.contact?.email) continue;
  entries.push({
    email: c.contact.email,
    source: "connect",
    updates: c.consents?.email_updates === true,
    name: c.contact.name || null,
    userId: c.user_id,
  });
}

const real = entries.filter((e) => !(e.userId && testIds.has(e.userId)));
console.log(`${real.length} entries (${entries.length - real.length} test skipped), ${new Set(real.map((e) => e.email.toLowerCase())).size} distinct emails`);
for (const e of real) {
  console.log(`${APPLY ? "add" : "would add"}  prism-${e.source}${e.updates ? " +newsletter" : ""}${e.name ? ` (${e.name.split(" ")[0]})` : ""}  ${e.email.replace(/^(.).*@/, "$1…@")}`);
  if (APPLY) {
    await addToAudience(e);
    await new Promise((r) => setTimeout(r, 150));
  }
}
