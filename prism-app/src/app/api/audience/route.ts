import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addToAudience, leaveNewsletter } from "@/lib/emailoctopus";

/**
 * A signed-in person's email, into the audience: when they save a spot with a
 * password (`source: "saved-spot"`, with `optIn` if they ticked updates), or
 * when they tick or untick the newsletter box on their You page (`optIn`
 * alone, true or false — `toggle` marks it as that page's own switch).
 *
 * The address comes from the request when given, because a changed auth email
 * can sit unconfirmed for a while and the person typed it seconds ago for this
 * account; otherwise it is the account's own.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const given = typeof body?.email === "string" ? body.email : user.email ?? "";
  const address = given.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }

  if (body?.toggle === true && body?.optIn === false) {
    const ok = await leaveNewsletter(address);
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Couldn't reach the mailing list." }, { status: 502 });
  }

  const name = String(user.user_metadata?.full_name ?? "").trim() || null;
  await addToAudience({
    email: address,
    source: body?.source === "saved-spot" ? "saved-spot" : undefined,
    newsletter: body?.optIn === true,
    resubscribe: body?.toggle === true,
    name,
    userId: user.id,
  });
  return NextResponse.json({ ok: true });
}
