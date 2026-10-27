import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addToAudience } from "@/lib/emailoctopus";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only ever a path on this site — never somewhere a crafted link chose.
  const asked = searchParams.get("next") ?? "";
  const next = asked.startsWith("/") && !asked.startsWith("//") ? asked : "/dashboard";

  // Google sends people back with an error instead of a code — most often
  // because that Google account already holds a different spot.
  const failed = searchParams.get("error_description") ?? searchParams.get("error");
  if (failed) {
    return NextResponse.redirect(`${origin}/login?google_error=${encodeURIComponent(failed)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) await rememberGoogle(user);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login`);
}

/**
 * A Google sign-in saves the spot just as the password form does: the address
 * goes onto the profile, which the admin views read, and into the audience.
 * Best effort — the person is already signed in, and that is what matters.
 */
async function rememberGoogle(user: {
  id: string;
  email?: string;
  user_metadata: Record<string, unknown>;
}) {
  const email = user.email!.toLowerCase();
  const fullName = String(user.user_metadata.full_name ?? user.user_metadata.name ?? "").trim();

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("email, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const update: Record<string, string> = {};
  if (!profile?.email) update.email = email;
  // Someone who arrives by Google alone gets the email's local part as a name
  // from the signup trigger; their Google first name is kinder.
  if (fullName && (!profile?.display_name || profile.display_name === email.split("@")[0])) {
    update.display_name = fullName.split(/\s+/)[0];
  }
  if (Object.keys(update).length) {
    await admin.from("profiles").update(update).eq("id", user.id);
  }

  await addToAudience({ email, source: "saved-spot", name: fullName, userId: user.id });
}
