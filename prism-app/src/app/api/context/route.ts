import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Capture coarse entry context — disclosed on the entry page.
 * City-level geo (from Vercel's IP-derived headers), timezone, language,
 * device type. Deliberately NOT stored: IP address, precise coordinates,
 * anything fingerprint-like. Visions are regional/local — this is the
 * minimum context that lets the collective map reflect place.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const h = req.headers;
  const ua = h.get("user-agent") ?? "";
  const deviceType = /mobile|iphone|android/i.test(ua)
    ? "mobile"
    : /ipad|tablet/i.test(ua)
      ? "tablet"
      : "desktop";

  let timezone: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.timezone === "string" && body.timezone.length < 64) {
      timezone = body.timezone;
    }
  } catch {
    // no body sent — fine
  }

  const joined_from = {
    country: h.get("x-vercel-ip-country") ?? null,
    region: h.get("x-vercel-ip-country-region") ?? null,
    city: h.get("x-vercel-ip-city") ? decodeURIComponent(h.get("x-vercel-ip-city")!) : null,
    timezone,
    language: h.get("accept-language")?.split(",")[0] ?? null,
    device: deviceType,
    noted_at: new Date().toISOString(),
  };

  // only set once — entry context, not a tracking trail
  const { data: profile } = await supabase
    .from("profiles").select("joined_from").eq("id", user.id).single();
  if (!profile?.joined_from) {
    await supabase.from("profiles").update({ joined_from }).eq("id", user.id);
  }

  return NextResponse.json({ ok: true });
}
