import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkKeeper } from "@/lib/keeper";
import { emailsByUser } from "@/lib/authEmails";

/**
 * The numbers the admin door opens with.
 *
 * Everything here is already answered somewhere deeper — People, Journey,
 * Emails, Technical. The point of gathering them is that the first screen
 * should tell a keeper how things stand in one look, and let them drill in,
 * rather than describing four tools in prose and making them choose blind.
 *
 * Counted the same way the pages themselves count: test accounts out, people
 * grouped by name because entering without an account mints a new identity
 * each time.
 */
export async function POST(req: NextRequest) {
  const { keeperPassword } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }

  const admin = createAdminClient();
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: profiles },
    { data: visions },
    { data: convos },
    { data: signups },
    { data: feedback },
    { data: events },
    authEmails,
  ] = await Promise.all([
    admin.from("profiles").select("id, display_name, email, is_test, created_at"),
    admin.from("vision_profiles").select("user_id, status, confirmed_at"),
    admin.from("conversations").select("user_id, created_at"),
    admin.from("mastermind_signups").select("user_id, created_at"),
    admin.from("feedback").select("id, created_at").order("created_at", { ascending: false }),
    admin
      .from("audit_log")
      .select("event_type, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    emailsByUser(),
  ]);

  const real = (profiles ?? []).filter((p) => !p.is_test);
  const realIds = new Set(real.map((p) => p.id));
  const names = new Set(
    real.map((p) => (p.display_name ?? "").trim().toLowerCase()).filter(Boolean)
  );

  const realVisions = (visions ?? []).filter((v) => realIds.has(v.user_id));
  const onMap = realVisions.filter((v) => v.status === "confirmed").length;
  const drafts = realVisions.filter((v) => v.status === "draft").length;

  const realSignups = (signups ?? []).filter((s) => realIds.has(s.user_id));
  const hasEmail = (id: string, email: unknown) => !!authEmails.get(id) || !!email;
  const saved = real.filter((p) => hasEmail(p.id, p.email)).length;

  const since = (iso: string | null | undefined) => !!iso && iso >= week;
  const lastEvent = events?.[0]?.created_at ?? null;
  const lastOf = (type: string) =>
    events?.find((e) => e.event_type === type)?.created_at ?? null;

  return NextResponse.json({
    people: names.size,
    entries: real.length,
    onMap,
    drafts,
    reachable: new Set([
      ...realSignups.map((s) => s.user_id),
      ...real.filter((p) => hasEmail(p.id, p.email)).map((p) => p.id),
    ]).size,
    mastermind: realSignups.length,
    saved,
    feedback: feedback?.length ?? 0,
    week: {
      arrived: real.filter((p) => since(p.created_at as string)).length,
      conversations: (convos ?? []).filter(
        (c) => realIds.has(c.user_id) && since(c.created_at as string)
      ).length,
      confirmed: realVisions.filter((v) => since(v.confirmed_at as string)).length,
      signups: realSignups.filter((s) => since(s.created_at as string)).length,
      feedback: (feedback ?? []).filter((f) => since(f.created_at as string)).length,
    },
    lastEvent,
    lastWeave: lastOf("collective.woven"),
    lastSignIn: lastOf("admin.signed_in"),
  });
}
