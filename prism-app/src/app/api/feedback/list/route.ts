import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkKeeper } from "@/lib/keeper";

/**
 * Keeper-only: read all feedback with names and pages.
 *
 * Gated on the keeper password alone. The signed-in check that used to sit
 * here added no security — anyone could obtain a session in seconds by typing
 * a name at /login — while forcing an admin to create a participant identity
 * on the collective map just to read a list.
 */
export async function POST(req: NextRequest) {
  const { keeperPassword } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("feedback")
    .select("id, message, page, created_at, profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: (data ?? []).map((f) => ({
      id: f.id,
      message: f.message,
      page: f.page,
      created_at: f.created_at,
      name: (f.profiles as unknown as { display_name: string } | null)?.display_name ?? "unknown",
    })),
  });
}
