import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addToAudience, pieceTags, type Piece } from "@/lib/emailoctopus";
import { audit } from "@/lib/audit";

/**
 * The switches on the You page, so a person can change what they gave us
 * without being sent somewhere else to do it.
 *
 *   { action: "name", name }   — what the Compass calls you
 *   { action: "call", on }     — join or leave the mastermind call list
 *   { action: "contact", on }  — whether the team may follow up on your piece
 *
 * Each acts only on the signed-in person's own rows, through the service role
 * because the signup list and the email columns aren't writable client-side.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const email = user.email?.toLowerCase() ?? null;

  if (body?.action === "name") {
    const name = String(body.name ?? "").trim().slice(0, 60);
    if (name.length < 2) return NextResponse.json({ error: "A name needs at least two letters." }, { status: 400 });
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "call") {
    if (!email) return NextResponse.json({ error: "Save your spot first, so the link has somewhere to go." }, { status: 400 });
    if (body.on) {
      const { error } = await admin
        .from("mastermind_signups")
        .upsert({ user_id: user.id, email }, { onConflict: "email", ignoreDuplicates: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await addToAudience({ email, source: "mastermind", userId: user.id });
    } else {
      const byUser = await admin.from("mastermind_signups").delete().eq("user_id", user.id);
      const byEmail = await admin.from("mastermind_signups").delete().eq("email", email);
      const error = byUser.error ?? byEmail.error;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await audit(body.on ? "mastermind.signup" : "mastermind.left", "mastermind", null, user.id, {});
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "contact") {
    const { data: connection } = await admin
      .from("connection_profiles")
      .select("consents, contact, confirmed, status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (connection?.status !== "confirmed") {
      return NextResponse.json({ error: "Save your piece first." }, { status: 400 });
    }
    const consents = { ...(connection.consents as Record<string, boolean>), contact_me: !!body.on };
    let contact = connection.contact as Record<string, string> | null;
    if (body.on && !contact?.email) {
      if (!email) return NextResponse.json({ error: "Save your spot first, so the team can reach you." }, { status: 400 });
      const { data: profile } = await admin.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      contact = { name: profile?.display_name ?? "", email, phone: "", preferred_method: "email" };
    }
    // Same rule as the recap page: contact details are kept only while "contact me" is on.
    if (!body.on) contact = null;
    const { error } = await admin
      .from("connection_profiles")
      .update({ consents, contact, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (body.on && contact) {
      await addToAudience({
        email: contact.email,
        source: "connect",
        name: contact.name,
        tags: pieceTags(connection.confirmed as Piece | null),
        userId: user.id,
      });
    }
    await audit("connection.contact_changed", "connection_profile", user.id, user.id, { contact_me: !!body.on });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
