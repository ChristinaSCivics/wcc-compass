import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkKeeper } from "@/lib/keeper";
import { audit } from "@/lib/audit";
import { emailsByUser } from "@/lib/authEmails";

/**
 * Keeper-only member roster: who is here, how far they've come, and which
 * identities are sandboxes. POST lists; PATCH flags an account as test or real.
 *
 * Counts are assembled in memory rather than in SQL — at circle scale that's a
 * handful of rows, and it keeps this readable without a view or an RPC.
 */

type Row = { user_id: string };

/**
 * joined_from is a jsonb record of where someone arrived from — city, region,
 * device and so on. It used to be handed to the page as-is, which React
 * refused to render, and the roster died with "this page couldn't load". Turn
 * it into the one line a human wants to read.
 */
type Joined = {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  device?: string | null;
};

function whereFrom(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const j = value as Joined;
  const place = [j.city, j.region].filter(Boolean).join(", ");
  const parts = [place || j.country, j.device].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export async function POST(req: NextRequest) {
  // The keeper password is the gate. Requiring a signed-in participant as well
  // stopped nobody — a session is five seconds and a name away — but it did
  // force an admin onto the collective map to read a roster.
  const { keeperPassword } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }

  const admin = createAdminClient();
  const [
    { data: profiles },
    { data: visions },
    { data: inputs },
    { data: convos },
    { data: msgs },
    { data: signups },
    authEmails,
  ] = await Promise.all([
      admin
        .from("profiles")
        .select("id, display_name, email, role, is_test, created_at, joined_from")
        .order("created_at", { ascending: true }),
      admin.from("vision_profiles").select("user_id, status, hidden, confirmed_at"),
      admin.from("decision_inputs").select("user_id, confirmed"),
      admin.from("conversations").select("id, user_id, kind, status, created_at"),
      // What people actually said. PRiSM's replies aren't progress, so only the
      // person's own messages are counted — this used to live on the Journey
      // page over a second copy of the same roster.
      admin.from("messages").select("conversation_id, role"),
      admin.from("mastermind_signups").select("user_id"),
      emailsByUser(),
    ]);

  const saidPerConvo = new Map<string, number>();
  for (const m of msgs ?? []) {
    if (m.role !== "user") continue;
    saidPerConvo.set(m.conversation_id, (saidPerConvo.get(m.conversation_id) ?? 0) + 1);
  }
  // The deepest single conversation, not the sum: someone who came back three
  // times and said one thing each time didn't get further than someone who
  // said three things once.
  const deepest = new Map<string, number>();
  for (const c of convos ?? []) {
    deepest.set(
      c.user_id,
      Math.max(deepest.get(c.user_id) ?? 0, saidPerConvo.get(c.id) ?? 0)
    );
  }
  const askedForCall = new Set((signups ?? []).map((s) => s.user_id).filter(Boolean));

  const countBy = (rows: Row[] | null, id: string) =>
    (rows ?? []).filter((r) => r.user_id === id).length;

  /**
   * Entering without an account mints a new identity every time — a different
   * browser, a different phone, or coming back after signing out all make one.
   * So the row count is a count of entries, not of people, and reading it as
   * people badly overstates the circle. Names are the only signal we have for
   * who is who, so rows are grouped by name and both numbers are reported.
   */
  const key = (name: string | null) => (name ?? "").trim().toLowerCase();
  const nameCounts = new Map<string, number>();
  for (const p of profiles ?? []) {
    if (p.is_test) continue;
    const k = key(p.display_name);
    if (k) nameCounts.set(k, (nameCounts.get(k) ?? 0) + 1);
  }

  const members = (profiles ?? []).map((p) => {
    const vision = (visions ?? []).find((v) => v.user_id === p.id);
    const said = deepest.get(p.id) ?? 0;
    const startedOne = (convos ?? []).some((c) => c.user_id === p.id);
    const mine = (convos ?? []).filter((c) => c.user_id === p.id);
    const lastActive = mine
      .map((c) => c.created_at)
      .sort()
      .at(-1) ?? null;
    return {
      id: p.id,
      name: p.display_name ?? "unnamed",
      // anonymous identities have no email; a saved spot does. Auth holds it —
      // profiles.email was never written by the save-spot flow.
      saved: !!authEmails.get(p.id) || !!p.email,
      role: p.role,
      isTest: p.is_test,
      joinedAt: p.created_at,
      joinedFrom: whereFrom(p.joined_from),
      visionStatus: vision?.status ?? "none",
      visionHidden: !!vision?.hidden,
      confirmedInputs: (inputs ?? []).filter((i) => i.user_id === p.id && i.confirmed).length,
      conversations: countBy(convos as Row[] | null, p.id),
      said,
      furthest:
        vision?.status === "confirmed"
          ? "confirmed a vision"
          : vision
            ? "reached a draft"
            : said > 0
              ? "talked to PRiSM"
              : startedOne
                ? "opened a conversation"
                : "arrived only",
      askedForCall: askedForCall.has(p.id),
      lastActive,
      // How many identities carry this same name, this one included.
      sameName: p.is_test ? 1 : nameCounts.get(key(p.display_name)) ?? 1,
    };
  });

  return NextResponse.json({ members, peopleCount: nameCounts.size });
}

export async function PATCH(req: NextRequest) {
  // Admins no longer need a participant session, so there may be nobody signed
  // in to attribute this to. The name picked at the admin door stands in — a
  // signature rather than proof, and recorded as such.
  const { keeperPassword, userId, isTest, displayName, actorName } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }
  if (typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const signedAs =
    typeof actorName === "string" && actorName.trim() ? actorName.trim() : null;

  const admin = createAdminClient();

  /**
   * Renaming an entry.
   *
   * People arrive twice — a second browser, a phone — and the app has no way to
   * know it's the same person. Names are all it has, so two entries become one
   * person by making the names match: "PeterPan" and "Peter" are one man with
   * two sessions. This edits what someone typed about themselves, so the old
   * name and the new one both go into the record under the keeper's signature.
   */
  if (typeof displayName === "string") {
    const next = displayName.trim();
    if (!next) {
      return NextResponse.json({ error: "a name is required" }, { status: 400 });
    }
    const { data: before } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    const { error } = await admin
      .from("profiles")
      .update({ display_name: next })
      .eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await audit("profile.renamed", "profile", userId, null, {
      from: before?.display_name ?? null,
      to: next,
      by_name: signedAs ?? "an admin holding the shared password",
    });
    return NextResponse.json({ ok: true });
  }

  if (typeof isTest !== "boolean") {
    return NextResponse.json({ error: "isTest or displayName is required" }, { status: 400 });
  }
  const { error } = await admin.from("profiles").update({ is_test: isTest }).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit("profile.test_flag_changed", "profile", userId, null, {
    is_test: isTest,
    by_name: signedAs ?? "an admin holding the shared password",
    via: signedAs ? "admin_signed_as" : "keeper_password",
  });

  return NextResponse.json({ ok: true });
}
