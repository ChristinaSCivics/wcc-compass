import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

const CONSENT_KEYS = ["contact_me", "note_my_organization", "email_updates", "note_my_referrals"] as const;

/**
 * The person confirms their Connection Interview recap and their permissions.
 * Consents are stored exactly as ticked, defaulting to false; contact details
 * are kept only when "contact me" is ticked.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const content = body?.content;
  if (!content || typeof content !== "object") {
    return NextResponse.json({ error: "nothing to save" }, { status: 400 });
  }

  const consents = Object.fromEntries(
    CONSENT_KEYS.map((k) => [k, body?.consents?.[k] === true])
  ) as Record<(typeof CONSENT_KEYS)[number], boolean>;

  let contact: Record<string, string> | null = null;
  if (consents.contact_me) {
    const c = body?.contact ?? {};
    const email = String(c.email ?? "").trim().slice(0, 200);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Add a valid email so the team can reach you." }, { status: 400 });
    }
    contact = {
      name: String(c.name ?? "").trim().slice(0, 120),
      email: email.toLowerCase(),
      phone: String(c.phone ?? "").trim().slice(0, 40),
      preferred_method: ["email", "phone", "text"].includes(c.preferred_method) ? c.preferred_method : "email",
    };
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("connection_profiles").upsert(
    {
      user_id: user.id,
      confirmed: content,
      consents,
      contact,
      status: "confirmed",
      confirmed_at: now,
      updated_at: now,
    },
    { onConflict: "user_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit("connection.confirmed", "connection_profile", user.id, user.id, {
    contact_me: consents.contact_me,
  });
  return NextResponse.json({ ok: true });
}
