import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkKeeper } from "@/lib/keeper";
import { audit } from "@/lib/audit";
import { placeOf } from "@/lib/places";
import {
  fiberyConfigured,
  fetchPeople,
  matchPerson,
  createPerson,
  fillEmail,
  personUrl,
  type FiberyPerson,
} from "@/lib/fibery";

/**
 * The Compass, meeting the WCC CRM.
 *
 * Two actions. "status" answers the question the Emails page asks — do we
 * already have this person in Fibery? — and changes nothing. "sync" writes:
 * it creates records for people Fibery has never met, and fills an email onto
 * a record that has none. It never edits a record someone wrote by hand, and
 * it never acts on a guess: a lone first name matching one Fibery person is
 * reported as a lead, not merged.
 *
 * Everyone is looked up, including the people who left only a name — knowing
 * that Laura is already in the CRM is exactly the useful part. Only people who
 * gave us an email are ever written, though: Fibery doesn't need 23 rows called
 * "Christina" with no way to reach any of them.
 */

type Contact = {
  id: string;
  name: string;
  email: string | null;
  otherEmail: string | null;
  mastermind: boolean;
  visionStatus: string;
  place: string | null;
  joinedAt: string;
};

async function allContacts(): Promise<Contact[]> {
  const admin = createAdminClient();
  const [{ data: profiles }, { data: signups }, { data: visions }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, email, is_test, created_at, joined_from")
      .order("created_at", { ascending: true }),
    admin.from("mastermind_signups").select("user_id, email, created_at"),
    admin.from("vision_profiles").select("user_id, status"),
  ]);

  const signupBy = new Map((signups ?? []).map((s) => [s.user_id as string, s]));
  const visionBy = new Map((visions ?? []).map((v) => [v.user_id as string, v.status as string]));

  const rows = (profiles ?? [])
    .filter((p) => !p.is_test)
    .map((p) => {
      const signup = signupBy.get(p.id);
      const mastermindEmail = (signup?.email as string | null) ?? null;
      const savedEmail = (p.email as string | null) ?? null;
      const email = mastermindEmail ?? savedEmail;
      return {
        id: p.id,
        name: (p.display_name as string) ?? "unnamed",
        email,
        otherEmail: savedEmail && savedEmail !== email ? savedEmail : null,
        mastermind: !!mastermindEmail,
        visionStatus: visionBy.get(p.id) ?? "none",
        place: placeOf(p.joined_from),
        joinedAt: p.created_at as string,
      } satisfies Contact;
    });

  // The same person entering twice is one person to Fibery. An email is the
  // only thing that proves two entries are the same person, so rows with one
  // are collapsed and rows without are left as they are — the page marks those
  // as repeats by name already.
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (!r.email) return true;
    const key = r.email.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** What we'd write on a record we create, said the way a person would read it. */
function signalFor(c: Contact): string {
  const parts = [
    c.mastermind ? "Signed up for the mastermind call" : "Saved their spot",
    c.visionStatus === "confirmed"
      ? "confirmed a vision"
      : c.visionStatus === "draft"
        ? "has a draft vision"
        : "no vision yet",
    c.place ?? null,
    `joined ${new Date(c.joinedAt).toLocaleDateString("en-US")}`,
  ].filter(Boolean);
  return parts.join(" · ");
}

function describe(match: ReturnType<typeof matchPerson>) {
  switch (match.kind) {
    case "email":
    case "name":
    case "maybe":
      return {
        kind: match.kind,
        fiberyName: match.person.name,
        fiberyUrl: personUrl(match.person.publicId),
        fiberyHasEmail: !!match.person.email,
      };
    case "ambiguous":
      return {
        kind: "ambiguous" as const,
        candidates: match.candidates.map((p: FiberyPerson) => ({
          name: p.name,
          url: personUrl(p.publicId),
        })),
      };
    default:
      return { kind: "none" as const };
  }
}

export async function POST(req: NextRequest) {
  const { keeperPassword, action, actorName } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }
  if (!fiberyConfigured()) {
    return NextResponse.json({ connected: false, contacts: [] });
  }

  let people;
  try {
    people = await fetchPeople();
  } catch (e) {
    return NextResponse.json(
      { connected: true, error: e instanceof Error ? e.message : "Fibery didn't answer" },
      { status: 502 }
    );
  }

  const contacts = await allContacts();
  const matched = contacts.map((c) => ({
    contact: c,
    match: matchPerson({ name: c.name, emails: [c.email, c.otherEmail] }, people),
  }));

  if (action !== "sync") {
    return NextResponse.json({
      connected: true,
      peopleInFibery: people.length,
      contacts: matched.map(({ contact, match }) => ({
        id: contact.id,
        email: contact.email,
        ...describe(match),
      })),
    });
  }

  // ---- writing ----
  const created: string[] = [];
  const filled: string[] = [];
  const skipped: { name: string; why: string }[] = [];

  for (const { contact, match } of matched) {
    // A name with no email gets looked up but never written: there'd be
    // nothing on the record to reach them by, and no way to tell one
    // "Christina" from the next.
    if (!contact.email) continue;
    try {
      if (match.kind === "none") {
        await createPerson({
          name: contact.name,
          email: contact.email,
          source: "The Compass demo",
          signal: signalFor(contact),
          participant: contact.visionStatus === "confirmed",
        });
        created.push(contact.name);
      } else if (
        (match.kind === "email" || match.kind === "name") &&
        !match.person.email
      ) {
        await fillEmail(match.person.id, contact.email);
        filled.push(match.person.name);
      } else if (match.kind === "maybe") {
        skipped.push({ name: contact.name, why: `might be ${match.person.name} — confirm by hand` });
      } else if (match.kind === "ambiguous") {
        skipped.push({ name: contact.name, why: "more than one person could be them" });
      } else {
        skipped.push({ name: contact.name, why: "already there" });
      }
    } catch (e) {
      skipped.push({
        name: contact.name,
        why: e instanceof Error ? e.message : "Fibery refused the write",
      });
    }
  }

  await audit("fibery.synced", "integration", null, null, {
    created: created.length,
    filled: filled.length,
    skipped: skipped.length,
    by_name: typeof actorName === "string" && actorName.trim() ? actorName.trim() : null,
  });

  return NextResponse.json({ connected: true, created, filled, skipped });
}
