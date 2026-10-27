import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addToAudience } from "@/lib/emailoctopus";

/**
 * Someone saved their spot with an email: add them to the team's audience.
 *
 * Signed-in only, since saving a spot always is. The address comes from the
 * request because a changed auth email can sit unconfirmed for a while, and
 * the person typed it seconds ago for exactly this account.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { email } = await req.json();
  const address = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }

  await addToAudience({ email: address, source: "saved-spot", userId: user.id });
  return NextResponse.json({ ok: true });
}
